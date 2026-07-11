export interface SendOtpResult {
  /** Opaque reference the provider issues; must be presented back to verify. */
  pinId: string;
}

export interface VerifyOtpResult {
  verified: boolean;
  /** Normalized phone the code was verified against, when the provider returns it. */
  phone?: string;
}

/**
 * A thin SMS/OTP driver. Swapping providers (Termii -> Twilio -> ...) means
 * implementing this interface and pointing SmsService at it — callers never
 * change.
 */
export interface SmsProvider {
  readonly name: string;

  /** Whether credentials are present; false means every send is a no-op. */
  isConfigured(): boolean;

  /** Generate and deliver a one-time code to `phone`; returns the pinId to verify against. */
  sendOtp(phone: string): Promise<SendOtpResult>;

  /** Check a user-entered code against a previously issued pinId. */
  verifyOtp(pinId: string, pin: string): Promise<VerifyOtpResult>;

  /** Fire a plain transactional SMS (order updates, etc.). */
  sendSms(phone: string, message: string): Promise<void>;
}
