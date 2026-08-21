/**
 * WebSocket 事件流路由：GET /api/events/stream?token=...
 * --------------------------------------------------
 * 对齐 DESKTOP_MIGRATION.md Phase 1 第 4 项：SSE → WebSocket，向玩家实时推送小镇日常/轮回事件。
 * 鉴权：浏览器等标准 client 无法在 WS 握手时附带 Authorization 头，故 token 走 query 参数，
 *       这里手动验签（本路由标记 public 以绕过 HTTP 头守卫）。
 * 隔离：按 player_id 订阅 broker，B 玩家订阅不到 A 玩家的事件。
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { subscribeToPlayer } from '../services/broker.js';

function sendError(socket: WebSocket, code: string): void {
  const raw = JSON.stringify({ error: { code, message: code } });
  if (socket.readyState === socket.OPEN) socket.send(raw);
}

export async function registerEventsStream(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/events/stream',
    { websocket: true, config: { public: true } },
    async (socket: WebSocket, req) => {
      const token = (req.query as { token?: string }).token;
      let playerId: number;
      try {
        const payload = app.jwt.verify<{ sub: string }>(token ?? '');
        playerId = Number(payload.sub);
      } catch {
        sendError(socket, 'UNAUTHORIZED');
        socket.close();
        return;
      }

      // 订阅该玩家事件；连接关闭/出错时取消订阅
      const unsubscribe = subscribeToPlayer(playerId, (event) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
      });
      socket.on('close', unsubscribe);
      socket.on('error', unsubscribe);
    },
  );
}