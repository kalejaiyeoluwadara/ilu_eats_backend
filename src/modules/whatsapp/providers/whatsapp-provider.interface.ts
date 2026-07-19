/**
 * A thin WhatsApp driver. Swapping providers (Meta Cloud API -> Twilio -> ...)
 * means implementing this interface and pointing WhatsappService at it — callers
 * never change. Mirrors the SmsProvider contract.
 */
export interface WhatsappProvider {
  readonly name: string;

  /** Whether credentials are present; false means every send is a no-op. */
  isConfigured(): boolean;

  /**
   * Send a pre-approved template message. Business-initiated messages (order
   * updates) MUST use templates — free-form text is only allowed inside the
   * 24-hour customer-service window. `bodyParams` fill the {{1}}, {{2}}, ...
   * placeholders in the template body, in order.
   */
  sendTemplate(
    phone: string,
    templateName: string,
    bodyParams: string[],
  ): Promise<void>;

  /**
   * Send a free-form text message. Only delivers if the recipient messaged the
   * business within the last 24 hours — useful for testing and for replies, not
   * for unsolicited order notifications.
   */
  sendText(phone: string, message: string): Promise<void>;
}
