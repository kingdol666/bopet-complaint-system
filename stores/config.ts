import { defineStore } from 'pinia'

interface ConfigData {
  productionLines: any[]
  customers: any[]
  productModels: any[]
  problemCategories: any[]
  problemSubcategories: any[]
  customerDemands: any[]
  compensationTypes: any[]
  severityLevels: any[]
  responsibleDepartments: any[]
  responsibleProcesses: any[]
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigData => ({
    productionLines: [],
    customers: [],
    productModels: [],
    problemCategories: [],
    problemSubcategories: [],
    customerDemands: [],
    compensationTypes: [],
    severityLevels: [],
    responsibleDepartments: [],
    responsibleProcesses: []
  }),

  getters: {
    // Get options for select components
    productionLineOptions: (state) =>
      state.productionLines.map(item => ({ label: item.name, value: item.id })),
    customerOptions: (state) =>
      state.customers.map(item => ({ label: item.name, value: item.id })),
    productModelOptions: (state) =>
      state.productModels.map(item => ({ label: item.name, value: item.id })),
    problemCategoryOptions: (state) =>
      state.problemCategories.map(item => ({ label: item.name, value: item.id })),
    problemSubcategoryOptions: (state) =>
      state.problemSubcategories.map(item => ({ label: item.name, value: item.id, categoryId: item.categoryId })),
    customerDemandOptions: (state) =>
      state.customerDemands.map(item => ({ label: item.name, value: item.id })),
    compensationTypeOptions: (state) =>
      state.compensationTypes.map(item => ({ label: item.name, value: item.id })),
    severityLevelOptions: (state) =>
      state.severityLevels.map(item => ({ label: item.name, value: item.id, color: item.color })),
    responsibleDepartmentOptions: (state) =>
      state.responsibleDepartments.map(item => ({ label: item.name, value: item.id })),
    responsibleProcessOptions: (state) =>
      state.responsibleProcesses.map(item => ({ label: item.name, value: item.id, departmentId: item.departmentId }))
  },

  actions: {
    async loadConfig() {
      try {
        const response = await $fetch('/api/config')
        if (response.success) {
          this.productionLines = response.data.productionLines
          this.customers = response.data.customers
          this.productModels = response.data.productModels
          this.problemCategories = response.data.problemCategories
          this.problemSubcategories = response.data.problemSubcategories
          this.customerDemands = response.data.customerDemands
          this.compensationTypes = response.data.compensationTypes
          this.severityLevels = response.data.severityLevels
          this.responsibleDepartments = response.data.responsibleDepartments
          this.responsibleProcesses = response.data.responsibleProcesses
        }
      } catch (error) {
        console.error('Failed to load config:', error)
      }
    },

    // Get subcategories by category ID
    getSubcategoriesByCategoryId(categoryId: number) {
      return this.problemSubcategories.filter(s => s.categoryId === categoryId)
    },

    // Get processes by department ID
    getProcessesByDepartmentId(departmentId: number) {
      return this.responsibleProcesses.filter(p => p.departmentId === departmentId)
    },

    // Get name by ID helpers
    getProductionLineName(id: number) {
      return this.productionLines.find(p => p.id === id)?.name || '-'
    },
    getCustomerName(id: number) {
      return this.customers.find(c => c.id === id)?.name || '-'
    },
    getProductModelName(id: number) {
      return this.productModels.find(p => p.id === id)?.name || '-'
    },
    getProblemCategoryName(id: number) {
      return this.problemCategories.find(p => p.id === id)?.name || '-'
    },
    getProblemSubcategoryName(id: number) {
      return this.problemSubcategories.find(p => p.id === id)?.name || '-'
    },
    getSeverityLevelName(id: number) {
      return this.severityLevels.find(s => s.id === id)?.name || '-'
    },
    getSeverityLevelColor(id: number) {
      return this.severityLevels.find(s => s.id === id)?.color || '#6b7280'
    },
    getCustomerDemandName(id: number) {
      return this.customerDemands.find(c => c.id === id)?.name || '-'
    },
    getCompensationTypeName(id: number) {
      return this.compensationTypes.find(c => c.id === id)?.name || '-'
    },
    getResponsibleDepartmentName(id: number) {
      return this.responsibleDepartments.find(r => r.id === id)?.name || '-'
    },
    getResponsibleProcessName(id: number) {
      return this.responsibleProcesses.find(r => r.id === id)?.name || '-'
    }
  }
})
