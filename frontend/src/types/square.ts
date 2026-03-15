// import type { OrderCake } from './types';

export type OrderStatus = 'a' | 'b' | 'c' | 'd' | 'e'; // a = pendente, b = feito online, c = loja, d= online & pago, e= cancelado
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface OrderData {
  id_client: string;
  first_name: string;
  last_name: string;
  email: string;
  tel: string;
  date: string;
  date_order: string;
  pickupHour: string;
  status: OrderStatus;        // Usando o tipo literal
  message: string;
  total_amount: number;
  payment_status: PaymentStatus; // Usando o tipo literal
  payment_id?: string;
  payment_details?: SquarePaymentDetails;
  cakes: OrderCakeItem[];
}

export interface OrderCakeItem {
  cake_id: number;
  name: string;
  amount: number;
  price: number;
  size: string;
  message_cake: string;
  fruit_option: string;
  fruit_price: number;
}

export interface SquarePaymentDetails {
  id: string;
  status: string;
  amountMoney: {
    amount: string;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Para a resposta da API de reserva
export interface ReservationResponse {
  success: boolean;
  error?: string;
  orderId?: string;
}

// Tipos para o Square SDK
export interface SquareCard {
  attach: (element: HTMLDivElement) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
}

export interface SquarePayments {
  card: () => Promise<SquareCard>;
}

export interface SquareTokenResult {
  status: string;
  token: string;
  details?: {
    method: string;
    message?: string;
    code?: string;
  };
}

export interface SquareError {
  code: string;
  category: string;
  detail: string;
  field?: string;
}

export interface SquarePaymentResponse {
  success: boolean;
  payment?: {
    id: string;
    status: string;
    amountMoney: {
      amount: string;
      currency: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  errors?: SquareError[];
}

export interface SquareWindow extends Window {
  Square: {
    payments: (appId: string, locationId: string) => SquarePayments;
  };
}

export interface OrderSummaryItem {
  name: string;
  size: string;
  amount: number;
  price: number;
  fruit_option: "有り" | "無し";
  message_cake?: string;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  tel: string;
}

export interface OrderSummaryData {
  items: OrderSummaryItem[];
  customer: CustomerInfo;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  message?: string;
}

export interface PaymentFormProps {
  appId: string;
  locationId: string;
  amount: number;
  currency: string;
  orderData: OrderSummaryData; // 🔥 Dados completos do pedido
  onPaymentSuccess: (result: SquarePaymentResponse) => void;
  onPaymentError: (error: SquareError | Error) => void;
  onReady?: () => void;
}

// export interface PaymentFormProps {
//   appId: string;
//   locationId: string;
//   amount: number;
//   currency: string;
//   orderItems?: OrderSummaryItem[]; 
//   totalAmount?: number; 
//   onPaymentSuccess: (result: SquarePaymentResponse) => void;
//   onPaymentError: (error: SquareError | Error) => void;
//   onReady?: () => void;
// }