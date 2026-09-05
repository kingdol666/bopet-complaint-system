# 最终端到端测试报告

> 测试日期：2026-09-05
> 测试方式：API 层完整用户旅程自动化测试（`scripts/test-final-e2e.cjs`）+ 5 个既有测试套件全量回归
> 测试环境：本地开发服务器 http://localhost:3100（SQLite）

## 一、测试范围

| 模块 | 覆盖内容 |
|---|---|
| 模板创建 | 8 种字段类型（text / textarea / number / select / date / switch / select-config / auto-complete），字段排序、选项配置读回验证 |
| 表单解析 | 双用户上传数据后逐字段回读验证：文本、多行文本（含换行）、数字、下拉、日期、开关、select-config（名称字符串）、auto-complete，以及 DB 列同步（feedbackDate）、templateIds 关联 |
| 权限隔离 | 双用户（operator=生产部普通用户，quality=质量部普通用户）+ 部门管理员 + superadmin 四角色矩阵：跨部门查看/编辑/删除拒绝、私密数据仅创建者可见、私密设置仅创建者可操作、部门管理员本部门编辑权限、「我创建的数据」API |
| 数据可视化 | 计数分组（select/FK/JSON 字段）、求和/平均聚合、占比、日期分布模式、日期分布+聚合叠加、无授权统计隔离、授权后统计联动 |
| 模板访问授权 | 发起申请 → 普通用户审批拒绝（403）→ 部门管理员批准 → 授权后可见公开数据（私密仍不可见）→ 授权后统计联动 → 撤销后立即失效 |
| 数据管理 | 导出 xlsx、模板筛选 + 关键字组合过滤 |

## 二、测试结果

### 最终结果：6 个测试套件 221 项全部通过

| 测试套件 | 结果 |
|---|---|
| test-final-e2e（本次新增最终 E2E） | 53 通过 / 0 失败 |
| test-permission-system（权限系统） | 37 通过 / 0 失败 |
| test-full-journey（完整用户旅程） | 55 通过 / 0 失败 |
| test-numeric-aggregate（数值聚合） | 20 通过 / 0 失败 |
| test-template-analysis（模板分析链路） | 14 通过 / 0 失败 |
| test-deep-edge（深层边界） | 42 通过 / 0 失败 |
| **合计** | **221 通过 / 0 失败** |

## 三、本轮发现的问题与修复

### 问题 1（严重，已修复）：select-config 字段使用自定义 fieldKey 时可视化统计报错或分组错误

**现象**：
- 对模板中 `fieldType=select-config`（configType=productionLines）但 fieldKey 为自定义键（如 `fe_prodline`）的字段做计数分组 → API 返回 500
- 做数值聚合 → 所有数据被归入「(空)」分组，无法按产线统计

**根因**：
前端表单提交 select-config / auto-complete 时，选项 value 为**名称字符串**（`{ label, value: label }`），存储于 `templateData` JSON 中，数据库 FK 列（如 `productionLineId`）不写入。而 `server/api/stats/custom.get.ts` 中三处分支只要模板字段带 configType 就按 DB FK 列处理：
1. 单字段计数分组路径：对 JSON key 执行 Prisma `groupBy` → PrismaClientValidationError 500
2. 数值聚合分支：LEFT JOIN FK 关联表 → 数据不在 FK 列，全部归 NULL 分组
3. 多字段分组路径：同上

**修复**：
三处 FK 分支增加精确守卫——仅当 fieldKey 本身就是 FK 列名（`CONFIG_TYPE_FK_MAP[configType].fkColumn === field`，即数据实际存储在 DB 列、典型为导入写入数字 ID 的场景）才走 JOIN 路径；否则一律走 JSON 路径（按 templateData 中存储的名称字符串分组）。

**修复后验证**：
- 计数分组：`一号产线:2, 二号产线:1` ✓
- 求和聚合：`一号产线=40, 二号产线=20`，总计 60，占比 66.7%/33.3% ✓
- 授权后统计联动：quality 授权后聚合 `一号产线=10`（正确排除他人私密数据的 30）✓

### 问题 2（环境，已修复，上一轮发现）：exceljs 依赖缺失

`package.json` 声明了 exceljs 但 node_modules 未安装，导出功能 500（`Cannot find module 'exceljs'`）。已安装修复，导出验证恢复（xlsx 552KB）。

### 测试预期修正（非应用 bug）

- 表单解析验证改为模拟真实表单行为（select-config 提交名称字符串而非数字 ID）
- 关键字过滤用例：数据内容在阶段 3 被部门管理员编辑覆盖，搜索关键字同步修正

## 四、已知边界行为（设计如此，非 bug）

1. **模板创建仅管理员可用**：普通用户创建模板返回 403（模板为管理资源）
2. **分析配置/看板保存仅管理员可用**：普通用户保存返回 403
3. **无授权导出返回 404**：「没有符合条件的数据可导出」——可见性过滤排除全部数据，不泄露存在性
4. **模板删除为软删除**：删除后 enabled=false，历史申请/授权记录保留
5. **select-config 数据不写 FK 列**：表单提交名称字符串存 JSON；FK 列仅在导入流程写入数字 ID 时填充，此时统计走 JOIN 显示关联表名称

## 五、结论

全部功能模块（表单解析、模板创建、可视化、权限隔离）在双用户不同权限场景下验证通过，本轮发现并修复 1 个严重统计 bug（select-config 自定义 fieldKey 场景）与 1 个环境依赖问题（exceljs），修复后 221 项测试全部通过，系统可投入生产。
