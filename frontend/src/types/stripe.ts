// src/types/stripe.ts
export interface OrderSummaryData {
  items: Array<{
    name: string;
    size: string;
    amount: number;
    price: number;
    fruit_option: '有り' | '無し';
    message_cake?: string;
  }>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    tel: string;
  };
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  message?: string;
}

export interface PaymentFormProps {
  amount: number;
  currency: string;
  orderData: OrderSummaryData;
  onPaymentSuccess: (paymentResult: StripePaymentResponse) => void;
  onPaymentError: (error: StripeError) => void;
  onReady?: () => void;
}

export interface StripePaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created: number;
  receipt_email?: string;
  description?: string;

}

export interface StripePaymentResponse {
  success: boolean;
  paymentIntent: StripePaymentIntent;
  clientSecret: string;
}

export interface StripeError {
  message: string;
  type?: string;
  code?: string;
  decline_code?: string;
}

// Tipos para o banco de dados
export type OrderStatus = 'a' | 'b' | 'c' | 'd' | 'f' | 'e'; // a = pendente, b = feito online, c = loja, d= online & pago, e= cancelado
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
  status: OrderStatus;
  message: string;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_details?: StripePaymentIntent;
  payment_intent_id?: string;
  cakes: Array<{
    cake_id: number;
    name: string;
    amount: number;
    price: number;
    size: string;
    message_cake?: string;
    fruit_option: "有り" | "無し";
    fruit_price: number;
  }>;
}