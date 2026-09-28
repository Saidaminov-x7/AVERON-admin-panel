import { api } from './axios';
export interface DashboardData{products:{published:number;pendingReview:number;rejected:number};orders:{total:number};users:{total:number};finance:{revenue:string|number;netProfit:string|number;expenses:string|number}}
export interface ImportedProduct{id:string;originalTitle:string;source:string;sourceUrl:string;sourcePriceCny:string;suggestedPriceUzs?:string;expectedProfitUzs?:string;status:string;createdAt:string}
export const getCommerceDashboard=()=>api.get<DashboardData>('/api/v1/admin/dashboard').then(r=>r.data);
export const getImports=(status='PENDING_REVIEW')=>api.get<ImportedProduct[]>('/api/v1/admin/imports',{params:{status}}).then(r=>r.data);
export const approveImport=(id:string,salePriceUzs:number,exchangeRate:number)=>api.post(`/api/v1/admin/imports/${id}/approve`,{salePriceUzs,exchangeRate,publish:true}).then(r=>r.data);
export const rejectImport=(id:string,reason:string)=>api.post(`/api/v1/admin/imports/${id}/reject`,{reason}).then(r=>r.data);
export const getProducts=()=>api.get('/api/v1/products',{params:{limit:48}}).then(r=>r.data);
export const createManualProduct=(payload:{title:string;titleUz?:string;titleEn?:string;description?:string;sourceUrl:string;imageUrl?:string;sourcePriceCny:number;exchangeRate:number;salePriceUzs:number;color?:string;size?:string;publish:boolean})=>api.post('/api/v1/admin/products',payload).then(r=>r.data);
export const getOrders=()=>api.get('/api/v1/admin/orders').then(r=>r.data);
