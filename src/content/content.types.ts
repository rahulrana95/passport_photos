/**
 * The shape every locale must satisfy.
 *
 * Declaring it as an interface rather than inferring it from the English file is
 * what makes a missing translation a compile error: a locale that omits a key,
 * or adds one nobody else has, fails `tsc`.
 */
export interface CommonContent {
  readonly skipToContent: string;
  readonly themeLabel: string;
  readonly loading: string;
  readonly retry: string;
  readonly close: string;
}

export interface UploadContent {
  readonly dropzoneLabel: string;
  readonly dropzoneHint: string;
  readonly browseLabel: string;
  readonly privacyNote: string;
  readonly errorTooLarge: string;
  readonly errorWrongType: string;
  readonly errorTooSmall: string;
  readonly errorHeicUnsupported: string;
  readonly errorCorrupt: string;
}

export interface ResultContent {
  readonly verdictPass: string;
  readonly verdictFail: string;
  readonly verdictWarning: string;
  readonly verdictManual: string;
  readonly verdictUndetectable: string;
  readonly manualChecklistHeading: string;
  readonly downloadDigital: string;
  readonly downloadPrintSheet: string;
  readonly downloadReport: string;
}

export interface LegalContent {
  readonly acceptanceDisclaimer: string;
  readonly privacyClaim: string;
  readonly verifyPrivacyHint: string;
  readonly specVerifiedOn: string;
}

export interface ContentTree {
  readonly common: CommonContent;
  readonly upload: UploadContent;
  readonly result: ResultContent;
  readonly legal: LegalContent;
}
