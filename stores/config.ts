import { defineStore } from 'pinia'

interface ConfigData {
  productionLines: any[]
  customers: any[]
  productModels: any[]
  responsibleDepartments: any[]
  responsibleProcesses: any[]
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigData => ({
    productionLines: [],
    customers: [],
    productModels: [],
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
          this.responsibleDepartments = response.data.responsibleDepartments
          this.responsibleProcesses = response.data.responsibleProcesses
        }
      } catch (error) {
        console.error('Failed to load config:', error)
      }
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
    getResponsibleDepartmentName(id: number) {
      return this.responsibleDepartments.find(r => r.id === id)?.name || '-'
    },
    getResponsibleProcessName(id: number) {
      return this.responsibleProcesses.find(r => r.id === id)?.name || '-'
    }
  }
})
