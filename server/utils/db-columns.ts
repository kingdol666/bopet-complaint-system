/**
 * DataRecord 数据库列元数据 —— 单一数据源
 *
 * 所有需要判断 "fieldKey 是否为 DB 列" 的地方都应引用此模块，
 * 禁止在各个 API / 页面中各自硬编码 DB_COLUMNS / FK_COLUMNS / DATE_FIELDS。
 *
 * 原理：利用 Prisma 生成的 TypeScript 类型 `DataRecordScalarFieldEnum`
 * 自动获取全部标量列名，确保与 schema.prisma 始终同步。
 */

import { Prisma } from '@prisma/client'

// ─── 从 Prisma 类型自动派生的 DB 标量列名集合 ───
// Prisma.DataRecordScalarFieldEnum 是一个 union string type，包含所有标量字段名
type DataRecordScalarField = keyof typeof Prisma.DataRecordScalarFieldEnum

/** DataRecord 表所有标量 DB 列名 */
export const DB_COLUMNS: Set<string> = new Set<string>(
  Object.keys(Prisma.DataRecordScalarFieldEnum) as string[]
)

// ─── FK 列 → 关联表元数据 ───
export interface FKMeta {
  /** Prisma 模型名（小写驼峰，如 customer） */
  prismaModel: string
  /** SQL 表名（如 customers） */
  sqlTable: string
  /** DataRecord 上的 FK 列名（如 customerId） */
  fkColumn: string
  /** 关联表中的名称列（如 name） */
  nameColumn: string
  /** 关联路径名（如 customer，用于 Prisma include） */
  relationPath: string
}

/**
 * FK 列名 → 关联表元数据映射
 * 这里的映射来源于 Prisma schema 中的 @relation 定义，
 * 是唯一需要手动维护的地方（因为 Prisma 不生成反向关系元数据）。
 * 仅在 schema.prisma 新增/删除 FK 关系时需更新此处。
 */
export const FK_META: Record<string, FKMeta> = {
  customerId: {
    prismaModel: 'customer',
    sqlTable: 'customers',
    fkColumn: 'customerId',
    nameColumn: 'name',
    relationPath: 'customer'
  },
  productModelId: {
    prismaModel: 'productModel',
    sqlTable: 'product_models',
    fkColumn: 'productModelId',
    nameColumn: 'name',
    relationPath: 'productModel'
  },
  productionLineId: {
    prismaModel: 'productionLine',
    sqlTable: 'production_lines',
    fkColumn: 'productionLineId',
    nameColumn: 'name',
    relationPath: 'productionLine'
  },
  responsibleDeptId: {
    prismaModel: 'responsibleDepartment',
    sqlTable: 'responsible_departments',
    fkColumn: 'responsibleDeptId',
    nameColumn: 'name',
    relationPath: 'responsibleDept'
  },
  responsibleProcessId: {
    prismaModel: 'responsibleProcess',
    sqlTable: 'responsible_processes',
    fkColumn: 'responsibleProcessId',
    nameColumn: 'name',
    relationPath: 'responsibleProcess'
  }
}

/** 判断 fieldKey 是否为 FK 列 */
export function isFKColumn(fieldKey: string): boolean {
  return fieldKey in FK_META
}

/** 获取 FK 列的关联表元数据 */
export function getFKMeta(fieldKey: string): FKMeta | null {
  return FK_META[fieldKey] || null
}

// ─── configType → FK 元数据映射 ───
// configType 是模板字段上配置的选项来源标识（如 'customers', 'productModels'），
// 用于 select-config / auto-complete 字段类型。
// 此映射将 configType 映射到对应的 FK 列元数据。
export const CONFIG_TYPE_FK_MAP: Record<string, FKMeta> = {
  customers: FK_META.customerId,
  productModels: FK_META.productModelId,
  productionLines: FK_META.productionLineId,
  responsibleDepartments: FK_META.responsibleDeptId,
  responsibleProcesses: FK_META.responsibleProcessId
}

/** 通过 configType 获取 FK 元数据 */
export function getFKMetaByConfigType(configType: string): FKMeta | null {
  return CONFIG_TYPE_FK_MAP[configType] || null
}

// ─── 日期类型 DB 列（存储为 DateTime，需特殊处理） ───
export const DB_DATE_COLUMNS: Set<string> = new Set([
  'feedbackDate',
  'productionTime',
  'createdAt',
  'updatedAt'
])

/** 用户可编辑的日期列（排除 createdAt / updatedAt） */
export const EDITABLE_DATE_COLUMNS: Set<string> = new Set([
  'feedbackDate',
  'productionTime'
])

// ─── 整数类型 DB 列（用于过滤时类型转换） ───
export const DB_INT_COLUMNS: Set<string> = new Set([
  'shaftCount',
  'quantityInvolved',
  'productModelId',
  'customerId',
  'productionLineId',
  'responsibleDeptId',
  'responsibleProcessId',
  'createdById',
  'updatedById',
  'id'
])

// ─── 可用于 GROUP BY 的直接字符串列 ───
export const GROUPABLE_STRING_COLUMNS: Set<string> = new Set([
  'category',
  'closureStatus',
  'thickness',
  'rollNo',
  'specification',
  'shiftTeam',
  'machineNo',
  'feedbackContent',
  'productUsage',
  'improvementAction',
  'batchNo',
  'application'
])

// ─── Prisma include 常量：加载所有 FK 关联 ───
export const DATA_INCLUDE = {
  customer: true,
  productModel: true,
  productionLine: true,
  responsibleDept: true,
  responsibleProcess: true
} as const

export const DATA_INCLUDE_FULL = {
  ...DATA_INCLUDE,
  attachments: true,
  createdBy: { select: { id: true, name: true, username: true } },
  updatedBy: { select: { id: true, name: true, username: true } }
} as const
