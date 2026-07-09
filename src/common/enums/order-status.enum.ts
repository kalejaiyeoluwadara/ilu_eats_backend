export enum OrderStatus {
  New = 'new',
  Preparing = 'preparing',
  Assigned = 'assigned',
  Out = 'out',
  Delivered = 'delivered',
}

export enum PaymentMethod {
  Card = 'card',
  Transfer = 'transfer',
  Cash = 'cash',
  Wallet = 'wallet',
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  NotApplicable = 'not_applicable',
}

export enum DeliveryMode {
  Door = 'door',
  Landmark = 'landmark',
}
