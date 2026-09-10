# BTCNVDA：已发生的挖矿交易与网页能力核查

日期2026-09-10。本文为PM实际读取公开链上历史回执和前端文件后的取证记录，不是项目方安全审计。
没有创建任何链上交易，没有连接钱包、签名、授权或花费链上资金。

## 真实历史挖矿样本（不是我们执行）
原始日志：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34470921759 ，job 102850371041。
读取时间2026-09-10T11:22:15Z至11:22:18Z；公共RPC https://rpc.mainnet.chain.robinhood.com ，chainId返回4663。
只读查询Hook 0x541c980ed3e0b5ced0bde5352c32bdab9d26a0cc在59352000至59358960块的WorkRecorded topic，共返回3个事件。三个参与地址各自产生该539轮的Work；不据此判断任何自然人身份、官方归属、全网用户数或未来运行状态。
事件topic是0x862d2ba9699aac256550b23287759d7118ed3f3b955c395c8068e5bb9e8e0cf4，与网站buy-core.mjs及WorkRecorded(address,uint256,uint256,uint256)的Keccak签名一致。

选取最后一笔：
- txHash：0x1e670a1b5b2e85030d1ca950044af99c03c300a3fa3eecf5991ec7059e65fbcd
- blockNumber：59354809（0x389aeb9）
- blockHash：0x24c3673d2b07187ac5290940b44e844662ba412e6201d941567032f67e24f707
- receipt.status：1；from=0xa761b292a2587e9fdc32eddac44dc00e37db3da2
- to=0x6b9e91b781f24dd3f374ec9008017e6328757e71
- 原生ETH value：0；但gasUsed=290100，effectiveGasPrice=131372000 wei，并非无Gas交易。
- input前4字节071e9503，与mine(uint256,uint256)选择器一致。两个32字节参数分别为3191717366834175和3166260000000002。
- 在固定区块59358960查询该执行目标：runtime5619字节，SHA-256 a3d4d3e528289100c06eaf0ecdd9a46f0ab55ef21c1207fe7f73bf7a2a9928bb；owner()和beneficiary()都返回上述from；hook()返回项目Hook。nvda()探测回滚，不把它伪造为可用getter。
- 这是观察到的特定账户执行器，不是已核验的官方公共矿工入口；用户不应向这个地址授权或转款。

## 回执资金流与Work（NVDA均18decimals）
1. NVDA标准Transfer：上述用户→执行器，3191717366834175最小单位，即0.003191717366834175 NVDA。
2. 项目Hook WorkRecorded：miner是上述用户，round539，增加3175758780000003，事件累计本轮总Work10789498780000001。
3. 项目Hook TollCharged：买入方向true，gross117620695555555703，fee3175758780000003，rate270bps。
   整数算术复核floor(117620695555555703*270/10000)=3175758780000003，等于实际Work增量。
4. NVDA标准Transfer：执行器→PoolManager，3175758780000004最小单位，即0.003175758780000004 NVDA。
5. NVDA标准Transfer：执行器→原用户，15958586834171最小单位，即0.000015958586834171 NVDA。
6. 本次转入=实际支出+退款，3191717366834175=3175758780000004+15958586834171。
7. 实际支出比Toll/Work仅多1个最小单位。PoolManager Swap记录的两个资产delta是-1和0；这笔回执没有BTCNVDA的ERC20转入/铸币事件。
8. 执行器自身最后一个事件含五个整数：budget、与上述支出一致的数值、Work一致数值、0、refund一致数值。由于未取得ABI，不把未确认的事件命名或字段排列当成源码证明。

## 可据此得到的有限结论
这不是仅有倒计时的静态概念：链上已发生通过辅助执行器、支付NVDA、收取实际买入Toll、记录Work和退回未用预算的成功交易。
本样本与白皮书所述“纯挖矿、几乎不交换现货、主要花费用于Work”的路径一致。
名义gross约0.117620695555555703 NVDA，不等于用户实际花费约0.003175758780000004 NVDA。不能把gross当本金支出，也不能把投入budget当Work。
这笔交易并没有证明用户已经领取BTCNVDA或已经盈利。所看到的是第539轮参与Work，而不是成交后直接发放同额股票、NVDA或BTC。
按样本所在时点的总Work算出的份额可能随该轮后续参与而变化，不能用这条事件给出最终收益承诺。
本次只读取历史执行，没有复跑源代码、退款失败场景、恶意调用、收益领取或权限撤销测试；一次成功样本不等于通用自动矿工安全成立。

## 网页实际能力：要区分文档、代码与实测
原文/代码采集：run34469839325（首页和sites.mjs），34470203161（buy-ui.mjs），34470416805（buy-core.mjs和文档）。
白皮书/路线图v1.2标注2026-09-06，仍称交易/领取/纯矿门户尚未公开。
但2026-09-10读取到的实际页面与静态模块已经有普通买入卡片，sites.mjs引入buy-ui.mjs并挂载买入功能。
因此不能笼统说“官网只有只读，所有交易都未实现”；也不能因为模块存在就称已通过真实钱包操作验收。

buy-ui.mjs：
- 地址 https://btcnvda.com/assets/buy-ui.mjs ，22327字节，SHA-256 173abc35f8740a1f152297e92c5e9d4ce9e5d01a4996d83f14320cfc7f56a4cf。
- 显示支付NVDA、收到BTCNVDA、ETH另付Gas，买入实际费用计Work。
- GET /api/buy/balance、/quote、/receipt为余额/报价/回执读取；自动更新报价不是自动下单。
- 文案显示可能需要两项有限授权，每一步都要用户确认。
- 明确说明普通买入不包含卖出、领取或自动挖矿。

buy-core.mjs：
- 地址 https://btcnvda.com/assets/buy-core.mjs ，15685字节，SHA-256 c79dedea0c7878c4b5574390246a84aed71e00fc7e65d230344c7f55804c74a6。
- 固定链4663及NVDA/BTCNVDA/Hook/Router/Permit2身份。
- approve-nvda阶段是NVDA给Permit2有限ERC20额度；approve-router阶段是在Permit2内给官方Router有限金额和deadline；buy阶段构造UniversalRouter execute。
- hookData显式编码当前账户，minOut与deadline单独约束。
- submit()通过钱包provider.request('eth_sendTransaction')发送，自动报价/回执轮询不会自动调用submit。
- 检查账户、链、nonce、代码重建的交易字段和报价时效；未知执行保存日志并阻止新重复提交。
- verifyReceipt根据真正Transfer/Toll/Work核对已发生的买入，不把一个成功哈希当作奖励证明。

尚未证实：本人钱包的买入端到端操作、网站领取功能实际开放、官方纯矿入口、后台持续自动运行、执行器部署/权限安全。
文件、代码和文档的开放状态存在不同步，后续应逐功能核实，不采用单一句“全部开放/全部未开放”。
