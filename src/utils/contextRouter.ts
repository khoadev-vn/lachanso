import { aiEngine } from "./transformerEngine";

export type TextArchetype =
"OTP_SAFE" |
"OTP_SCAM" |
"TRANSACTION_SAFE" |
"SECURITY_ALERT_SAFE" |
"SECURITY_ALERT_SCAM" |
"SERVICE_NOTIFICATION_SAFE" |
"NEWS_CLAIM";

export interface ArchetypeResult {
  archetype: TextArchetype;
  reasoning: string;
}

const INTENT_ANCHORS = [
{
  intent: "OTP_AUTH",
  text: "Mã xác nhận OTP của bạn là 123456. Tuyệt đối không cung cấp mã này cho người khác. Không chia sẻ mã này để đảm bảo an toàn."
},
{
  intent: "OTP_AUTH",
  text: "Your verification code is 123456. Do not share this with anyone."
},
{
  intent: "TRANSACTION",
  text: "Thông báo biến động số dư tài khoản. Giao dịch thành công, số dư thay đổi. Chuyển khoản thanh toán tiền."
},
{
  intent: "SECURITY_ALERT",
  text: "Cảnh báo bảo mật quan trọng: Hệ thống phát hiện đăng nhập từ thiết bị lạ hoặc địa chỉ IP mới. Nếu không phải bạn, vui lòng đổi mật khẩu ngay lập tức."
},
{
  intent: "SECURITY_ALERT",
  text: "Security alert: We noticed a new login from an unrecognized device or IP. Please secure your account."
},
{
  intent: "SERVICE_NOTIFICATION",
  text: "Thông báo từ hệ thống dịch vụ: Hóa đơn của bạn đã được tạo. Dịch vụ đã được gia hạn thành công. Vui lòng thanh toán hoặc kiểm tra thông tin đơn hàng."
},
{
  intent: "SERVICE_NOTIFICATION",
  text: "Cảnh báo quan trọng: Nghiêm cấm sử dụng dịch vụ vào mục đích vi phạm pháp luật. Important Warning: strictly prohibited to use the service for purposes that violate the laws."
},
{
  intent: "SERVICE_NOTIFICATION",
  text: "This is a notice that an invoice has been generated. Your payment method is invoice items total due."
},
{
  intent: "NEWS_ARTICLE",
  text: "Bài báo hôm nay đưa tin về tình hình kinh tế, chính trị, y tế và xã hội. Phóng viên ghi nhận sự kiện diễn ra tại địa phương."
}];


let anchorEmbeddings: {intent: string;embedding: number[];}[] = [];

async function getAnchorEmbeddings() {
  if (anchorEmbeddings.length > 0) return anchorEmbeddings;


  const embeddings = [];
  for (const anchor of INTENT_ANCHORS) {
    const vector = await aiEngine.getRawEmbedding(anchor.text);
    if (vector) {
      embeddings.push({ intent: anchor.intent, embedding: vector });
    }
  }

  anchorEmbeddings = embeddings;
  return anchorEmbeddings;
}

export async function evaluateTextArchetype(text: string): Promise<ArchetypeResult> {


  if (text.length > 280) {
    return { archetype: "NEWS_CLAIM", reasoning: "Văn bản dài hơn 280 ký tự, được chuyển hướng sang luồng tin tức/kiểm chứng chi tiết." };
  }

  const lowerText = text.toLowerCase();


  const textEmbedding = await aiEngine.getRawEmbedding(text);
  let matchedIntent = "NEWS_ARTICLE";
  let maxSimilarity = 0;

  if (textEmbedding) {
    const anchors = await getAnchorEmbeddings();
    for (const anchor of anchors) {
      const similarity = aiEngine.cosineSimilarity(textEmbedding, anchor.embedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedIntent = anchor.intent;
      }
    }
  }


  if (maxSimilarity < 0.70) {
    matchedIntent = "NEWS_ARTICLE";
  }


  const hasPhishingCall = /cung cấp (mã|otp|thông tin|mật khẩu|tài khoản|cmnd|cccd)|nhập (mã|vào|otp|mật khẩu)|truy cập (vào )?(đường dẫn|link|ngay)|click (vào|ngay)|bấm vào đây|xác minh tại đây/i.test(lowerText);
  const links = lowerText.match(/(https?:\/\/[^\s]+)/g) || [];

  if (matchedIntent === "OTP_AUTH") {
    if (hasPhishingCall && links.length > 0) {
      return { archetype: "OTP_SCAM", reasoning: `AI nhận diện ngữ cảnh OTP (${(maxSimilarity * 100).toFixed(0)}%) nhưng phát hiện dấu hiệu lừa đảo nhấp link (Phishing).` };
    }
    return { archetype: "OTP_SAFE", reasoning: `AI Semantic Space xác nhận đây là văn bản cung cấp mã OTP/Xác thực uy tín (${(maxSimilarity * 100).toFixed(0)}%).` };
  }

  if (matchedIntent === "TRANSACTION") {
    if (!hasPhishingCall) {
      return { archetype: "TRANSACTION_SAFE", reasoning: `AI Semantic Space xác nhận tin nhắn giao dịch ngân hàng / tài chính hợp lệ (${(maxSimilarity * 100).toFixed(0)}%).` };
    }
  }

  if (matchedIntent === "SECURITY_ALERT") {
    const trustedDomains = ["google.com", "microsoft.com", "facebook.com", "apple.com", "zalo.me", "id.apple.com"];
    const hasTrustedLink = links.some((link) => trustedDomains.some((domain) => link.includes(domain)));


    if (links.length > 0 && !hasTrustedLink && hasPhishingCall) {
      return { archetype: "SECURITY_ALERT_SCAM", reasoning: `AI nhận diện Cảnh báo bảo mật (${(maxSimilarity * 100).toFixed(0)}%) kèm yêu cầu truy cập link lạ (Phishing).` };
    }

    return { archetype: "SECURITY_ALERT_SAFE", reasoning: `AI Semantic Space xác nhận thông báo bảo mật / đăng nhập từ hệ thống dịch vụ (${(maxSimilarity * 100).toFixed(0)}%).` };
  }

  if (matchedIntent === "SERVICE_NOTIFICATION") {
    if (!hasPhishingCall) {
      return { archetype: "SERVICE_NOTIFICATION_SAFE", reasoning: `AI Semantic Space phân loại là Email/Thông báo dịch vụ hệ thống (${(maxSimilarity * 100).toFixed(0)}%).` };
    }
  }


  return { archetype: "NEWS_CLAIM", reasoning: `AI đo đạc không gian ngữ nghĩa (Max Sim: ${(maxSimilarity * 100).toFixed(0)}%). Xử lý theo luồng tin tức thời sự.` };
}
