const BASE = "https://graph.facebook.com/v20.0";

async function waFetch(url: string, accessToken: string, method = "GET", body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? `WhatsApp API ${res.status}`);
  }
  return data;
}

export async function getPhoneNumberInfo(phoneNumberId: string, accessToken: string) {
  return waFetch(
    `${BASE}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,status,name_status`,
    accessToken
  );
}

export async function sendTextMessage(phoneNumberId: string, accessToken: string, to: string, text: string) {
  return waFetch(`${BASE}/${phoneNumberId}/messages`, accessToken, "POST", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  });
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[]
) {
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components?.length) template.components = components;
  return waFetch(`${BASE}/${phoneNumberId}/messages`, accessToken, "POST", {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template,
  });
}

export async function getWabaTemplates(wabaId: string, accessToken: string) {
  return waFetch(`${BASE}/${wabaId}/message_templates?fields=id,name,category,language,status,components`, accessToken);
}

export async function submitTemplateToMeta(
  wabaId: string,
  accessToken: string,
  name: string,
  category: string,
  language: string,
  bodyText: string
) {
  return waFetch(`${BASE}/${wabaId}/message_templates`, accessToken, "POST", {
    name,
    category: category.toUpperCase(),
    language,
    components: [{ type: "BODY", text: bodyText }],
  });
}

export async function deleteMetaTemplate(wabaId: string, accessToken: string, templateName: string) {
  const res = await fetch(
    `${BASE}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&access_token=${encodeURIComponent(accessToken)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data as any).error?.message ?? "Failed to delete template");
  return data;
}

export async function getWabaInfo(wabaId: string, accessToken: string) {
  return waFetch(`${BASE}/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace`, accessToken);
}
