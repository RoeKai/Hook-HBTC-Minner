import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AccumulationPreview from './AccumulationPreview';

const calculate = () => fireEvent.click(screen.getByRole('button', { name: '计算本轮方案' }));

describe('AccumulationPreview jsdom component', () => {
  it('calculates without a wallet or external capability', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<AccumulationPreview />);
    calculate();
    expect(screen.getByRole('status')).toHaveTextContent('建议参与');
    expect(screen.getByText('预计新增 BTCNVDA 区间')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('invalidates the old result as soon as an input changes', () => {
    render(<AccumulationPreview />);
    calculate();
    fireEvent.change(screen.getByLabelText('NVDA 可用总额'), { target: { value: '11' } });
    expect(screen.getByRole('status')).toHaveTextContent('需重新计算');
    expect(screen.queryByText('建议参与')).not.toBeInTheDocument();
  });

  it('skips when the cost limit is too low', () => {
    render(<AccumulationPreview />);
    fireEvent.change(screen.getByLabelText(/每千枚最高预估成本/), { target: { value: '0.000000000000000001' } });
    calculate();
    expect(screen.getByRole('status')).toHaveTextContent('建议跳过');
  });

  it('participates in the previously missed 0.005 NVDA cost-cap case', () => {
    render(<AccumulationPreview />);
    fireEvent.change(screen.getByLabelText(/每千枚最高预估成本/), { target: { value: '0.005' } });
    calculate();
    expect(screen.getByRole('status')).toHaveTextContent('建议参与');
    expect(screen.getByRole('status')).toHaveTextContent('已选');
    expect(screen.getByRole('status')).toHaveTextContent(/ID budget-/);
  });

  it('shows the explicit demo FX and exact candidate details', () => {
    render(<AccumulationPreview />);
    calculate();
    expect(screen.getByText(/1 ETH = 1 NVDA（仅用于演示，非市场汇率）/)).toBeInTheDocument();
    expect(screen.getAllByText('精确明细').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('合格但未选');
    expect(screen.getByRole('status')).toHaveTextContent('被拒');
  });

  it('changes calculated rewards for high competition and late entry', () => {
    render(<AccumulationPreview />);
    fireEvent.change(screen.getByLabelText('竞争情景'), { target: { value: 'high' } });
    calculate();
    const high = screen.getByText('预计新增 BTCNVDA 区间').parentElement?.textContent;
    fireEvent.change(screen.getByLabelText('竞争情景'), { target: { value: 'late' } });
    calculate();
    const late = screen.getByText('预计新增 BTCNVDA 区间').parentElement?.textContent;
    expect(high).not.toBe(late);
  });

  it('waits and never reports zero cost when FX is missing', () => {
    render(<AccumulationPreview />);
    fireEvent.change(screen.getByLabelText('竞争情景'), { target: { value: 'no-fx' } });
    calculate();
    expect(screen.getByRole('status')).toHaveTextContent('建议等待');
    expect(screen.getByRole('status')).toHaveTextContent('综合成本未知');
  });

  it.each([
    ['NVDA 可用总额', '-1'], ['NVDA 可用总额', '1e3'], ['剩余计划轮数', '0'],
    ['剩余计划轮数', '1.5'], ['剩余计划轮数', '4321'],
  ])('rejects invalid %s input', (label, value) => {
    render(<AccumulationPreview />);
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    calculate();
    expect(screen.getByRole('status')).toHaveTextContent(/无效|必须/);
    expect(screen.queryByText('建议参与')).not.toBeInTheDocument();
  });
});
