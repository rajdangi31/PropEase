import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const keys = {
  me: ["me"],
  adminStats: ["adminStats"],
  tenantDashboard: ["tenantDashboard"],
  properties: ["properties"],
  units: ["units"],
  maintenance: ["maintenance"],
  myMaintenance: ["myMaintenance"],
  payments: ["payments"],
  tenants: ["tenants"],
  notifications: ["notifications"],
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get("/auth/me"),
    retry: false,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: keys.adminStats,
    queryFn: () => api.get("/dashboard/admin/stats"),
  });
}

export function useTenantDashboard() {
  return useQuery({
    queryKey: keys.tenantDashboard,
    queryFn: () => api.get("/dashboard/tenant/dashboard"),
  });
}

export function useProperties() {
  return useQuery({
    queryKey: keys.properties,
    queryFn: () => api.get("/properties"),
  });
}

export function useAddProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; address: string; description?: string }) => api.post("/properties", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.properties });
    },
  });
}

export function useUnits(propertyId: string | null) {
  return useQuery({
    queryKey: [...keys.units, propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/units`),
    enabled: !!propertyId,
  });
}

export function useAddUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: any }) => 
      api.post(`/properties/${propertyId}/units`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...keys.units, variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: keys.properties });
    },
  });
}

export function useTenants() {
  return useQuery({
    queryKey: keys.tenants,
    queryFn: () => api.get("/tenants"),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => api.get("/notifications"),
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; type?: string }) => api.post("/notifications/announce", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications });
    },
  });
}

export function useAdminMaintenance() {
  return useQuery({
    queryKey: keys.maintenance,
    queryFn: () => api.get("/maintenance"),
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.patch(`/maintenance/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.maintenance });
      queryClient.invalidateQueries({ queryKey: keys.myMaintenance });
    },
  });
}

export function useMyMaintenance() {
  return useQuery({
    queryKey: keys.myMaintenance,
    queryFn: () => api.get("/maintenance/my-requests"),
  });
}

export function useTenantMaintenance() {
  return useQuery({
    queryKey: ["tenantMaintenance"],
    queryFn: () => api.get("/maintenance/my-requests"),
  });
}

export function useSubmitMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; category: string; priority: string; description: string }) => 
      api.post("/maintenance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.myMaintenance });
      queryClient.invalidateQueries({ queryKey: keys.maintenance });
    },
  });
}

export function useAdminPayments() {
  return useQuery({
    queryKey: keys.payments,
    queryFn: () => api.get("/payments"),
  });
}

export function useTenantPayments() {
  return useQuery({
    queryKey: ["tenantPayments"],
    queryFn: () => api.get("/payments/my-history"),
  });
}

export function useSubmitPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number }) => api.post("/payments/pay", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenantDashboard });
      queryClient.invalidateQueries({ queryKey: ["tenantPayments"] });
    },
  });
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ["paymentSummary"],
    queryFn: () => api.get("/payments/summary"),
  });
}

export function useMyDocuments() {
  return useQuery({
    queryKey: ["myDocuments"],
    queryFn: () => api.get("/documents/my-documents"),
  });
}
