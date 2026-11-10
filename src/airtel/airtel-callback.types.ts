export interface AirtelTransaction {
  id: string;
  message?: string;
  status_code: string;
  airtel_money_id?: string;
}

export interface AirtelCallbackBody {
  transaction: AirtelTransaction;
  hash?: string;
}

export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
