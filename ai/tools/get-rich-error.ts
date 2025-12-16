interface Params {
  args?: Record<string, unknown>;
  action: string;
  error: unknown;
}

interface ErrorFields {
  message: string;
  json?: unknown;
  text?: string;
}

/**
 * Allows to parse a thrown error to check its metadata and construct a rich
 * message that can be handed to the LLM.
 */
export function getRichError({ action, args, error }: Params) {
  const fields: ErrorFields = getErrorFields(error);

  let message = `Error during ${action}: ${fields.message}`;

  if (args) {
    message += `\nParameters: ${JSON.stringify(args, null, 2)}`;
  }

  if (fields.json) {
    message += `\nJSON: ${JSON.stringify(fields.json, null, 2)}`;
  }

  if (fields.text) {
    message += `\nText: ${fields.text}`;
  }

  return {
    message,
    error: fields,
  };
}

function getErrorFields(error: unknown): ErrorFields {
  if (error instanceof Error) {
    return {
      message: error.message,
      json: error,
      text: error.stack,
    };
  }

  return {
    message: String(error),
    json: error,
    text: typeof error === "string" ? error : undefined,
  };
}
