// ============================================================
// VOICE EVENTS SERVICE
// Context-aware event announcements for Gov Form AI using native Hindi Speech Synthesis.
// Zero additional AI API calls. Uses existing frontend state only.
// Includes deduplication & throttling.
// ============================================================

export class VoiceEvents {
  private static lastSpokenMessage: string = '';
  private static lastSpokenTimestamp: number = 0;
  private static THROTTLE_MS: number = 2000;

  /**
   * Triggers speech output for given Hindi text with deduplication & throttling.
   */
  private static speak(message: string): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();

    // Prevent repeating identical message within 8 seconds
    if (this.lastSpokenMessage === message && now - this.lastSpokenTimestamp < 8000) {
      return;
    }

    // Throttle overlapping announcements within minimum window
    if (now - this.lastSpokenTimestamp < this.THROTTLE_MS) {
      return;
    }

    this.lastSpokenMessage = message;
    this.lastSpokenTimestamp = now;

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop ongoing speech to avoid overlaps
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'hi-IN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('[VoiceEvents] Speech synthesis error:', e);
      }
    }
  }

  /** Event 1: Dashboard Open */
  public static announceDashboard(): void {
    this.speak(
      'नमस्ते! Gov Form AI में आपका स्वागत है। सबसे पहले अपना आवेदन फॉर्म अपलोड करें, उसके बाद अपने आवश्यक दस्तावेज़ अपलोड करें। यदि किसी भी चरण में सहायता चाहिए, तो मैं यहाँ हूँ।'
    );
  }

  /** Event 2: Blank Form Uploaded */
  public static announceFormUpload(): void {
    this.speak(
      'बहुत बढ़िया! आवेदन फॉर्म सफलतापूर्वक अपलोड हो गया है। अब अपने आवश्यक दस्तावेज़ अपलोड करें।'
    );
  }

  /** Event 3: Supporting Document Uploaded */
  public static announceDocumentUpload(): void {
    this.speak('दस्तावेज़ प्राप्त हो गया है। मैं उससे जानकारी निकाल रहा हूँ।');
  }

  /** Event 4: OCR Started */
  public static announceOCRStarted(): void {
    this.speak('कृपया कुछ क्षण प्रतीक्षा करें। मैं आपके दस्तावेज़ का विश्लेषण कर रहा हूँ।');
  }

  /** Event 5: OCR Completed */
  public static announceOCRCompleted(): void {
    this.speak('आपकी जानकारी सफलतापूर्वक निकाल ली गई है। अब मैं फॉर्म भर रहा हूँ।');
  }

  /** Event 6: Missing Fields Exist */
  public static announceMissingFields(): void {
    this.speak(
      'कुछ जानकारी उपलब्ध नहीं है। कृपया आवश्यक दस्तावेज़ अपलोड करें ताकि शेष जानकारी भी भरी जा सके।'
    );
  }

  /** Event 7: Download Ready */
  public static announceDownloadReady(): void {
    this.speak('आपका आवेदन तैयार है। कृपया समीक्षा करें और फिर डाउनलोड करें।');
  }
}
