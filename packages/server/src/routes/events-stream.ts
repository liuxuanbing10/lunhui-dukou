/**
 * WebSocket 事件流路由：GET /api/events/stream?token=...
 * --------------------------------------------------
 * 对齐 DESKTOP_MIGRATION.md Phase 1 第 4 项：SSE → WebSocket，向玩家实时推送小镇日常/轮回事件。
 * 鉴权：浏览器等标准 client 无法在 WS 握手时附带 Authorization 头，故 token 走 query 参数，
 *       这里手动验签（本路由标记 public 以绕过 HTTP 头守卫）。
 * 隔离：按 player_id 订阅 broker，B 玩家订阅不到 A 玩家的事件。
 *
 * ⚠️ 上线前迁移项：token 经 URL query 传输会进入访问/代理日志（7d 敏感期）。正式上线前
 *   应改用 `Sec-WebSocket-Protocol` 子协议携带 token（配合 @fastify/websocket 的
 *   handleProtocols 校验回显）。
 * ⚠️ 未被消费：本事件流当前没有任何客户端在连（Godot 客户端仅走 HTTP），在真实 WS 握手
 *   下的行为未经生产验证。启用前需补真实 `ws` 客户端集成测试。
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { subscribeToPlayer } from '../services/broker.js';

/** 每玩家 WS 连接数上限：防重连风暴/攻击按连接数线性放大内存与广播扇出 */
const MAX_WS_PER_PLAYER = 3;
const wsConnections = new Map<number, number>();

/** 心跳间隔：网络静默断开（NAT 超时）而没有 close 事件时强制清理，防 handler 滞留泄漏 */
const WS_HEARTBEAT_MS = 30_000;

function incConnections(playerId: number): boolean {
  const n = wsConnections.get(playerId) ?? 0;
  if (n >= MAX_WS_PER_PLAYER) return false;
  wsConnections.set(playerId, n + 1);
  return true;
}

function decConnections(playerId: number): void {
  const n = wsConnections.get(playerId) ?? 1;
  if (n <= 1) wsConnections.delete(playerId);
  else wsConnections.set(playerId, n - 1);
}

/** 空安全发送：仅在 socket 确为 WebSocket 时发送，避免非 Upgrade 请求路径下崩成 500 */
function sendError(socket: WebSocket, code: string): void {
  const send = (socket as unknown as { send?: (d: string) => void }).send;
  if (typeof send === 'function') {
    send(JSON.stringify({ error: { code, message: code } }));
  }
}

export async function registerEventsStream(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/events/stream',
    { websocket: true, config: { public: true } },
    async (socket: WebSocket, req) => {
      // 注意：WS 升级后 req.query 在某些传输下为 undefined，统一从原始 URL 解析 token，避免 500
      const rawUrl = typeof req.url === 'string' ? req.url : '';
      const token = new URL(rawUrl, 'http://localhost').searchParams.get('token') ?? '';
      let playerId: number;
      try {
        const payload = app.jwt.verify<{ sub: string }>(token);
        playerId = Number(payload.sub);
      } catch {
        sendError(socket, 'UNAUTHORIZED');
        if (typeof socket.close === 'function') socket.close();
        return;
      }

      // 每玩家连接数上限
      if (!incConnections(playerId)) {
        sendError(socket, 'WS_CONNECTIONS_LIMITED');
        if (typeof socket.close === 'function') socket.close();
        return;
      }

      // 订阅该玩家事件；连接关闭/出错时取消订阅
      const unsubscribe = subscribeToPlayer(playerId, (event) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
      });

      // 心跳保活：pong 存活标记 + 定时 ping，静默死亡则 terminate
      const ws = socket as WebSocket & { isAlive?: boolean };
      ws.isAlive = true;
      if (typeof ws.on === 'function') ws.on('pong', () => { ws.isAlive = true; });
      const hb = setInterval(() => {
        if (ws.isAlive === false) {
          clearInterval(hb);
          if (typeof ws.terminate === 'function') ws.terminate();
          return;
        }
        ws.isAlive = false;
        if (typeof ws.ping === 'function') ws.ping();
      }, WS_HEARTBEAT_MS);

      const cleanup = (): void => {
        clearInterval(hb);
        decConnections(playerId);
        unsubscribe();
      };
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );
}