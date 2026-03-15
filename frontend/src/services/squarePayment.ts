import type { SquarePaymentResponse, SquareError } from '../types/square';

const API_URL = import.meta.env.VITE_API_URL;

export class PaymentError extends Error {
  readonly squareErrors?: SquareError[];

  constructor(
    message: string,
    squareErrors?: SquareError[]
  ) {
    super(message);
    this.name = 'PaymentError';
    this.squareErrors = squareErrors;
  }
}

export const processPayment = async (
  sourceId: string, 
  amount: number, 
  currency: string = 'JPY'
): Promise<SquarePaymentResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceId,
        amount,
        currency
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SquarePaymentResponse = await response.json();
    
    if (!result.success) {
      throw new PaymentError(
        result.errors?.[0]?.detail || '決済に失敗しました',
        result.errors
      );
    }
    
    return result;
  } catch (error) {
    if (error instanceof PaymentError) {
      throw error;
    }
    throw new PaymentError(
      error instanceof Error ? error.message : '決済処理中にエラーが発生しました'
    );
  }
};