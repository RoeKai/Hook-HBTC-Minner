import { useState, type FormEvent } from 'react';
import { emissionAt, explainUnselected, selectCandidate, type Decision } from '../core/accumulation';
import { generatePreviewCandidates } from '../core/accumulation-preview';
import { formatAmount, parseAmount } from '../core/amount';

const DECIMALS = 18;
const ROUND = 144;
const GAS_WEI = 2_000_000_000_000n;
const CLAIM_GAS_WEI = 1_000_000_000_000n;
const SERVICE_COST = 1_000_000_000_000n;

type Scenario = 'normal' | 'high' | 'late' | 'no-fx';
type Fields = {
  available: string;
  perRound: string;
  costCap: string;
  rounds: string;
  nvdaReserve: string;
  ethBudget: string;
  scenario: Scenario;
};

const initial: Fields = {
  available: '10', perRound: '2', costCap: '100', rounds: '10',
  nvdaReserve: '0.01', ethBudget: '0.01', scenario: 'normal',
};

function minimum(...values: bigint[]): bigint {
  return values.reduce((current, value) => value < current ? value : current);
}

function displayExact(value: bigint, symbol: string): string {
  return formatAmount({ value, decimals: DECIMALS, symbol }, DECIMALS);
}

const actionText = { PARTICIPATE: '建议参与', WAIT: '建议等待', SKIP: '建议跳过' } as const;

export default function AccumulationPreview() {
  const [fields, setFields] = useState(initial);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const change = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setDecision(null);
    setError('');
    setDirty(true);
  };

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    setDecision(null);
    setError('');
    try {
      if (!/^\d+$/.test(fields.rounds)) throw new Error('剩余计划轮数必须是 1 到 4320 的整数');
      const rounds = Number(fields.rounds);
      if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 4320) throw new Error('剩余计划轮数必须是 1 到 4320 的整数');
      const available = parseAmount(fields.available, DECIMALS, 'NVDA').value;
      const perRound = parseAmount(fields.perRound, DECIMALS, 'NVDA').value;
      const costCap = parseAmount(fields.costCap, DECIMALS, 'NVDA').value;
      const nvdaReserve = parseAmount(fields.nvdaReserve, DECIMALS, 'NVDA').value;
      const ethBudget = parseAmount(fields.ethBudget, DECIMALS, 'ETH').value;
      if (available <= nvdaReserve + SERVICE_COST) throw new Error('NVDA 可用总额必须高于费用预留和模拟服务费');
      if (perRound === 0n) throw new Error('单轮转入上限必须大于 0');
      if (costCap === 0n) throw new Error('每千枚最高预估成本必须大于 0');
      const paced = (available - nvdaReserve - SERVICE_COST) / BigInt(rounds);
      const maxBudget = minimum(perRound, paced);
      if (maxBudget === 0n) throw new Error('按剩余轮数分配后，本轮没有可用预算');
      const { target } = emissionAt(ROUND);
      const scenarioMap: Record<Scenario, bigint[]> = {
        normal: [0n, target / 2n], high: [4n * target, 8n * target],
        late: [0n, 4n * target], 'no-fx': [0n, target / 2n],
      };
      const now = 1_000;
      setDecision(selectCandidate({
        round: ROUND, ownWork: 0n, otherWorkScenarios: scenarioMap[fields.scenario],
        nvdaAvailable: available, ethAvailable: ethBudget, perRoundCap: maxBudget,
        dailyRemaining: maxBudget, nvdaReserved: 0n, ethReserved: 0n,
        nvdaFeeReserve: nvdaReserve, ethExitReserve: 0n, costPerThousandCap: costCap,
        now, fx: fields.scenario === 'no-fx' ? null : { numerator: 1n, denominator: 1n, observedAt: now, maxAgeSeconds: 30, source: '离线演示 FX 1:1（非市场汇率）' },
        candidates: generatePreviewCandidates({
          maxBudget, target, ownWork: 0n, otherWorkScenarios: scenarioMap[fields.scenario],
          gasWei: GAS_WEI, claimGasWei: CLAIM_GAS_WEI, serviceCostNvda: SERVICE_COST,
        }),
      }));
      setDirty(false);
    } catch (caught) {
      setError(caught instanceof Error ? `输入无效：${caught.message}` : '输入无效，请检查后重试');
    }
  };

  const selected = decision?.selected;
  return <section className="acc-preview" aria-labelledby="acc-preview-title">
    <div className="acc-preview__heading">
      <div><p className="eyebrow">ACCUMULATION / PREVIEW</p><h2 id="acc-preview-title">BTCNVDA 低成本积累预览</h2></div>
      <strong>固定演示轮次：144</strong>
    </div>
    <p className="acc-preview__warning">离线演示，不发送交易；竞争与费用为假设，结果不是保证。</p>
    <p className="acc-preview__note">剩余轮数只用于均匀安排本轮预算节奏，不代表未来竞争或奖励已经确定。自身现有 Work 固定假设为 0。</p>
    <form onSubmit={calculate} noValidate>
      <div className="acc-preview__form">
        <label>NVDA 可用总额<input value={fields.available} onChange={(e) => change('available', e.target.value)} inputMode="decimal" /></label>
        <label>单轮转入上限<input value={fields.perRound} onChange={(e) => change('perRound', e.target.value)} inputMode="decimal" /></label>
        <label>每千枚最高预估成本（NVDA/1000 BTCNVDA）<input value={fields.costCap} onChange={(e) => change('costCap', e.target.value)} inputMode="decimal" /></label>
        <label>剩余计划轮数<input value={fields.rounds} onChange={(e) => change('rounds', e.target.value)} inputMode="numeric" /></label>
        <label>NVDA 费用预留<input value={fields.nvdaReserve} onChange={(e) => change('nvdaReserve', e.target.value)} inputMode="decimal" /></label>
        <label>ETH 费用预算<input value={fields.ethBudget} onChange={(e) => change('ethBudget', e.target.value)} inputMode="decimal" /></label>
        <label>竞争情景<select value={fields.scenario} onChange={(e) => change('scenario', e.target.value as Scenario)}><option value="normal">普通</option><option value="high">高竞争</option><option value="late">晚加入</option><option value="no-fx">缺汇率</option></select></label>
      </div>
      <details className="acc-preview__assumptions"><summary>查看费用、汇率与演示假设</summary><p>演示汇率：1 ETH = 1 NVDA（仅用于演示，非市场汇率）。适配器固定假设：paid=floor(budget×995/1000)、work=paid、refund=budget-paid；执行 Gas 0.000002 ETH、领取 Gas 0.000001 ETH、服务费 0.000001 NVDA；固定演示轮次 144。零候选费用为 0。</p></details>
      <button className="primary" type="submit">计算本轮方案</button>
    </form>
    <div className="acc-preview__status" role="status" aria-live="polite">
      {error && <p className="acc-preview__error">{error}</p>}
      {!error && !decision && <p>{dirty ? '输入或情景已变化，需重新计算。' : '填写预算和成本标准后计算；无需连接钱包。'}</p>}
      {decision && <>
        <h3>{actionText[decision.action]}</h3><p>{decision.reason}</p>
        {decision.action === 'WAIT' && <p><b>综合成本未知</b></p>}
        {selected && <div className="acc-preview__results">
          <span>建议转入预算<strong>{displayExact(selected.budget, 'NVDA')}</strong></span>
          <span>预计实付<strong>{displayExact(selected.paid, 'NVDA')}</strong></span>
          <span>退款<strong>{displayExact(selected.refund, 'NVDA')}</strong></span>
          <span>Work<strong>{selected.work.toString()}</strong></span>
          <span>预计新增 BTCNVDA 区间<strong>{displayExact(selected.rewardLow, 'BTCNVDA')} ～ {displayExact(selected.rewardHigh, 'BTCNVDA')}</strong></span>
          <span>每千枚综合成本<strong>{selected.costPerThousand === null ? '综合成本未知' : displayExact(selected.costPerThousand, 'NVDA')}</strong></span>
          <span>费用明细<strong>实付 {displayExact(selected.paid, 'NVDA')} + 服务费 {displayExact(selected.serviceCostNvda, 'NVDA')} + 执行/领取 Gas {displayExact(selected.gasWei + selected.claimGasWei, 'ETH')}</strong></span>
        </div>}
        <h3>全部候选</h3><ul className="acc-preview__candidates">{decision.candidates.map((item) => {
          const state = item.id === selected?.id ? '已选' : item.accepted ? '合格但未选' : '被拒';
          const reason = item.id === selected?.id ? '符合约束且排序第一' : selected ? explainUnselected(item, selected) : item.reason;
          return <li key={item.id} data-state={state}><b>ID {item.id}</b><strong>{displayExact(item.budget, 'NVDA')}</strong><span>{state}：{reason}</span><details><summary>精确明细</summary><span>实付 {displayExact(item.paid, 'NVDA')}；退款 {displayExact(item.refund, 'NVDA')}；Work {item.work.toString()}；成本 {item.costNvda === null ? '未知' : displayExact(item.costNvda, 'NVDA')}</span></details></li>;
        })}</ul>
      </>}
    </div>
  </section>;
}
