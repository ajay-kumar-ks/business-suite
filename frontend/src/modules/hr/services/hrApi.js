import api from '../../../services/api'

export const hrAPI = {
  // ── Health Check ──
  getStatus: () =>
    api.get('/hr/'),

  // ── Employees ──
  getEmployees: (params = {}) =>
    api.get('/hr/employees', { params }),

  getEmployeesByDepartment: (departmentId) =>
    api.get('/hr/employees', { params: { department_id: departmentId } }),

  getEmployee: (id) =>
    api.get(`/hr/employees/${id}`),

  createEmployee: (data) =>
    api.post('/hr/employees', data),

  updateEmployee: (id, data) =>
    api.put(`/hr/employees/${id}`, data),

  deleteEmployee: (id) =>
    api.delete(`/hr/employees/${id}`),

  // ── Roles ──
  getRoles: () =>
    api.get('/hr/roles'),

  createRole: (data) =>
    api.post('/hr/roles', data),

  updateRole: (id, data) =>
    api.put(`/hr/roles/${id}`, data),

  deleteRole: (id) =>
    api.delete(`/hr/roles/${id}`),

  // ── Departments ──
  getDepartments: () =>
    api.get('/hr/departments'),

  createDepartment: (data) =>
    api.post('/hr/departments', data),

  updateDepartment: (id, data) =>
    api.put(`/hr/departments/${id}`, data),

  deleteDepartment: (id) =>
    api.delete(`/hr/departments/${id}`),

  // ── Attendance ──
  markAttendance: (data) =>
    api.post('/hr/attendance', data),

  getAttendance: (params = {}) =>
    api.get('/hr/attendance', { params }),

  getAttendanceByEmployee: (employeeId) =>
    api.get(`/hr/attendance/${employeeId}`),

  // ── Leave ──
  createLeave: (data) =>
    api.post('/hr/leaves', data),

  getLeaves: (params = {}) =>
    api.get('/hr/leaves', { params }),

  updateLeaveStatus: (id, data) =>
    api.patch(`/hr/leaves/${id}`, data),

  // ── Users ──
  getUsers: () =>
    api.get('/hr/users'),

  createUser: (data) =>
    api.post('/hr/users', data),

  updateUser: (id, data) =>
    api.put(`/hr/users/${id}`, data),

  deleteUser: (id) =>
    api.delete(`/hr/users/${id}`),

  // ── Employee Self-Service ──
  getMyProfile: () =>
    api.get('/hr/me'),

  getMyAttendance: () =>
    api.get('/hr/me/attendance'),

  checkIn: () =>
    api.post('/hr/me/attendance/checkin'),

  checkOut: () =>
    api.post('/hr/me/attendance/checkout'),

  getMyLeaves: () =>
    api.get('/hr/me/leaves'),

  createMyLeave: (data) =>
    api.post('/hr/me/leaves', data),

  // ── Dashboard ──
  getDashboard: () =>
    api.get('/hr/dashboard'),
}
