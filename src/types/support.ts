export type SupportCategory = 'ACCOUNT'|'PAYMENT'|'TECHNICAL'|'DATA_PRIVACY'|'OTHER';
export type SupportStatus = 'OPEN'|'IN_PROGRESS'|'WAITING_FOR_USER'|'CLOSED';
export interface SupportTicket { _id:string; ticketCode:string; userId:string; userName:string; userEmail:string; title:string; category:SupportCategory; status:SupportStatus; lastMessageAt:string; createdAt:string; }
export interface SupportMessage { _id:string; ticketId:string; authorId:string; actor:'USER'|'ADMIN'; content:string; createdAt:string; }
export interface SupportDetail { ticket:SupportTicket; messages:SupportMessage[]; }
export interface SupportPageData { items:SupportTicket[]; page:number; limit:number; total:number; totalPages:number; }
