import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AskingPhase } from './AskingPhase';
import { ChoicePhase } from './ChoicePhase';
import { MemoryPhase } from './MemoryPhase';
import { DeathPhase } from './DeathPhase';

const noop = () => {};

describe('AskingPhase', () => {
  it('渲染提问区与剩余次数（居民选择已移至场景点击）', () => {
    render(
      <AskingPhase
        question=""
        questionsLeft={10}
        busy={false}
        inputRef={{ current: null }}
        onQuestionChange={noop}
        onAsk={noop}
      />,
    );
    expect(screen.getByPlaceholderText(/向渡口的人提问/)).toBeTruthy();
    expect(screen.getByText('本轮回剩余问题：10 / 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: '问' })).toBeTruthy();
  });

  it('输入问题后可触发提问，空问题禁用按钮', async () => {
    const user = userEvent.setup();
    let asked = false;
    render(
      <AskingPhase
        question="你捞过我吗"
        questionsLeft={9}
        busy={false}
        inputRef={{ current: null }}
        onQuestionChange={noop}
        onAsk={() => {
          asked = true;
        }}
      />,
    );
    const btn = screen.getByRole('button', { name: '问' });
    expect(btn.getAttribute('disabled')).toBeNull();
    await user.click(btn);
    expect(asked).toBe(true);
  });
});

describe('ChoicePhase', () => {
  it('两个选择按钮回调正确', async () => {
    const user = userEvent.setup();
    const choices: string[] = [];
    render(<ChoicePhase busy={false} onChoice={(c) => choices.push(c)} />);
    await user.click(screen.getByText(/上船/));
    await user.click(screen.getByText(/留下/));
    expect(choices).toEqual(['leave', 'stay']);
  });
});

describe('MemoryPhase', () => {
  it('有记忆时渲染，无记忆返回 null', () => {
    const { rerender } = render(<MemoryPhase lines={['蓑衣人提到：我捞过你']} onContinue={noop} />);
    expect(screen.getByText('你记得：')).toBeTruthy();
    rerender(<MemoryPhase lines={[]} onContinue={noop} />);
    expect(screen.queryByText('你记得：')).toBeNull();
  });

  it('有记忆时提供继续出口，点击触发 onContinue（修复 memory 相位卡死）', async () => {
    const user = userEvent.setup();
    let continued = false;
    render(
      <MemoryPhase lines={['蓑衣人提到：我捞过你']} onContinue={() => { continued = true; }} />,
    );
    const btn = screen.getByRole('button', { name: /醒来，继续这趟渡口/ });
    await user.click(btn);
    expect(continued).toBe(true);
  });
});

describe('DeathPhase', () => {
  it('渲染后果与重启按钮', async () => {
    const user = userEvent.setup();
    let next = false;
    render(
      <DeathPhase
        consequence="船在河心沉没"
        deathLine="第七次了"
        busy={false}
        onNextLoop={() => {
          next = true;
        }}
      />,
    );
    expect(screen.getByText('船在河心沉没')).toBeTruthy();
    await user.click(screen.getByText('从水里醒来'));
    expect(next).toBe(true);
  });
});
