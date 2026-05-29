/**
 * TRUSTED DOMAINS DATABASE - Lá Chắn Số
 * Cơ sở dữ liệu tên miền chính thống cho hệ thống chấm điểm
 * Cập nhật: 2026
 */

export interface TrustedDomain {
  domain: string;
  category: TrustedDomainCategory;
  country: "VN" | "GLOBAL";
  trustScore: number; // 0–100, điểm tin cậy
  note?: string;
}

export type TrustedDomainCategory =
  | "gov_vn"         // Cơ quan nhà nước Việt Nam
  | "media_vn"       // Báo chí Việt Nam chính thống
  | "bank_vn"        // Ngân hàng Việt Nam chính thống
  | "gov_global"     // Cơ quan nhà nước quốc tế
  | "media_global"   // Báo chí quốc tế uy tín
  | "tech_global"    // Công ty công nghệ lớn
  | "edu_vn"         // Giáo dục Việt Nam
  | "health_vn"      // Y tế Việt Nam
  | "fintech_vn"     // Fintech/thanh toán Việt Nam
  | "ecom_vn"        // Thương mại điện tử uy tín
  | "factcheck"      // Tổ chức kiểm chứng sự thật
  | "security"       // Tổ chức bảo mật
  | "telecom_vn";    // Viễn thông Việt Nam

export const TRUSTED_DOMAINS: TrustedDomain[] = [
  // ============================================================
  // NHÓM 1: CƠ QUAN NHÀ NƯỚC VIỆT NAM (.gov.vn)
  // ============================================================
  { domain: "chinhphu.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Cổng thông tin điện tử Chính phủ" },
  { domain: "mps.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Công an" },
  { domain: "mic.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Thông tin & Truyền thông" },
  { domain: "mof.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Tài chính" },
  { domain: "moet.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Giáo dục & Đào tạo" },
  { domain: "moh.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Y tế" },
  { domain: "molisa.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Lao động TBXH" },
  { domain: "mard.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Nông nghiệp & PTNT" },
  { domain: "mot.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Giao thông Vận tải" },
  { domain: "moc.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Xây dựng" },
  { domain: "mofa.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Ngoại giao" },
  { domain: "mpi.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Kế hoạch & Đầu tư" },
  { domain: "moit.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Công Thương" },
  { domain: "monre.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Tài nguyên & Môi trường" },
  { domain: "mcst.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Văn hóa Thể thao Du lịch" },
  { domain: "nacis.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Cục An ninh mạng (Bộ Công an)" },
  { domain: "vneids.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Hệ thống định danh điện tử VNeID" },
  { domain: "dichvucong.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Cổng dịch vụ công quốc gia" },
  { domain: "gdt.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Tổng cục Thuế" },
  { domain: "customs.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Tổng cục Hải quan" },
  { domain: "bhxh.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bảo hiểm Xã hội Việt Nam" },
  { domain: "vnpt.gov.vn", category: "gov_vn", country: "VN", trustScore: 95, note: "VNPT - Tập đoàn BC-VT" },
  { domain: "sbv.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Ngân hàng Nhà nước Việt Nam" },
  { domain: "gdlegal.moj.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Bộ Tư pháp" },
  { domain: "sggp.org.vn", category: "gov_vn", country: "VN", trustScore: 95, note: "Sài Gòn Giải Phóng" },
  { domain: "hanoitv.vn", category: "gov_vn", country: "VN", trustScore: 90, note: "Đài Hà Nội" },
  { domain: "hcmc.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "UBND TP.HCM" },
  { domain: "hanoi.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "UBND Thành phố Hà Nội" },
  { domain: "cand.com.vn", category: "gov_vn", country: "VN", trustScore: 95, note: "Báo Công an Nhân dân" },
  { domain: "vksndtc.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Viện Kiểm sát Nhân dân Tối cao" },
  { domain: "toaan.gov.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Tòa án Nhân dân Tối cao" },
  { domain: "dangcongsan.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Đảng Cộng sản Việt Nam" },
  { domain: "mattran.org.vn", category: "gov_vn", country: "VN", trustScore: 100, note: "Mặt trận Tổ quốc Việt Nam" },
  { domain: "nld.com.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Báo Người Lao Động" },

  // ============================================================
  // NHÓM 2: BÁO CHÍ VIỆT NAM CHÍNH THỐNG
  // ============================================================
  { domain: "vnexpress.net", category: "media_vn", country: "VN", trustScore: 95, note: "VnExpress - Báo điện tử lớn nhất VN" },
  { domain: "tuoitre.vn", category: "media_vn", country: "VN", trustScore: 95, note: "Báo Tuổi Trẻ" },
  { domain: "thanhnien.vn", category: "media_vn", country: "VN", trustScore: 95, note: "Báo Thanh Niên" },
  { domain: "dantri.com.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Dân Trí" },
  { domain: "vtv.vn", category: "media_vn", country: "VN", trustScore: 98, note: "Đài Truyền hình Việt Nam" },
  { domain: "vov.vn", category: "media_vn", country: "VN", trustScore: 98, note: "Đài Tiếng nói Việt Nam" },
  { domain: "nhandan.vn", category: "media_vn", country: "VN", trustScore: 98, note: "Báo Nhân Dân" },
  { domain: "baochinhphu.vn", category: "media_vn", country: "VN", trustScore: 100, note: "Báo Chính phủ" },
  { domain: "laodong.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Báo Lao Động" },
  { domain: "vietnamnet.vn", category: "media_vn", country: "VN", trustScore: 88, note: "VietnamNet" },
  { domain: "tienphong.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Báo Tiền Phong" },
  { domain: "zingnews.vn", category: "media_vn", country: "VN", trustScore: 85, note: "Zing News" },
  { domain: "baomoi.com", category: "media_vn", country: "VN", trustScore: 80, note: "Bao Mới - Tổng hợp" },
  { domain: "vtcnews.vn", category: "media_vn", country: "VN", trustScore: 85, note: "VTC News" },
  { domain: "soha.vn", category: "media_vn", country: "VN", trustScore: 80, note: "Soha News" },
  { domain: "anninhthudo.vn", category: "media_vn", country: "VN", trustScore: 88, note: "An Ninh Thủ Đô" },
  { domain: "phapluat.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Pháp Luật TP.HCM" },
  { domain: "cafebiz.vn", category: "media_vn", country: "VN", trustScore: 85, note: "CafeBiz - Kinh doanh" },
  { domain: "cafef.vn", category: "media_vn", country: "VN", trustScore: 85, note: "CafeF - Tài chính" },
  { domain: "baodautu.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Báo Đầu Tư" },
  { domain: "vneconomy.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Vietnam Economy" },
  { domain: "baotintuc.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Báo Tin Tức (TTXVN)" },
  { domain: "vnanet.vn", category: "media_vn", country: "VN", trustScore: 98, note: "Thông tấn xã Việt Nam" },
  { domain: "antv.gov.vn", category: "media_vn", country: "VN", trustScore: 98, note: "An ninh TV" },
  { domain: "quandoinhandan.vn", category: "media_vn", country: "VN", trustScore: 95, note: "Báo Quân đội Nhân dân" },
  { domain: "plo.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Pháp Luật Online" },
  { domain: "congthuong.vn", category: "media_vn", country: "VN", trustScore: 88, note: "Tạp chí Công Thương" },
  { domain: "tapchitaichinh.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Tạp chí Tài Chính" },
  { domain: "kiemtoan.vn", category: "media_vn", country: "VN", trustScore: 90, note: "Kiểm Toán Nhà Nước" },
  { domain: "dangkykinhdoanh.gov.vn", category: "gov_vn", country: "VN", trustScore: 100 },

  // ============================================================
  // NHÓM 3: NGÂN HÀNG VIỆT NAM CHÍNH THỐNG
  // ============================================================
  { domain: "vietcombank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "Ngân hàng Vietcombank" },
  { domain: "vcb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "VCB - Vietcombank domain phụ" },
  { domain: "mbbank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "MB Bank" },
  { domain: "vpbank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "VPBank" },
  { domain: "techcombank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "Techcombank" },
  { domain: "agribank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "Agribank" },
  { domain: "bidv.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "BIDV" },
  { domain: "vietinbank.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "VietinBank" },
  { domain: "hdbank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "HDBank" },
  { domain: "acb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "ACB" },
  { domain: "sacombank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "Sacombank" },
  { domain: "tpbank.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "TPBank" },
  { domain: "vib.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "VIB" },
  { domain: "msb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "MSB" },
  { domain: "seabank.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "SeABank" },
  { domain: "ocb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "OCB" },
  { domain: "ncb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "NCB" },
  { domain: "bvb.com.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "BaoViet Bank" },
  { domain: "scb.com.vn", category: "bank_vn", country: "VN", trustScore: 90, note: "SCB" },
  { domain: "abbank.vn", category: "bank_vn", country: "VN", trustScore: 100, note: "ABBank" },

  // ============================================================
  // NHÓM 4: FINTECH & THANH TOÁN VIỆT NAM
  // ============================================================
  { domain: "momo.vn", category: "fintech_vn", country: "VN", trustScore: 95, note: "Ví MoMo" },
  { domain: "zalopay.vn", category: "fintech_vn", country: "VN", trustScore: 95, note: "ZaloPay" },
  { domain: "vnpay.vn", category: "fintech_vn", country: "VN", trustScore: 95, note: "VNPAY" },
  { domain: "viettel.com.vn", category: "telecom_vn", country: "VN", trustScore: 95, note: "Viettel" },
  { domain: "viettelmoney.vn", category: "fintech_vn", country: "VN", trustScore: 95, note: "Viettel Money" },
  { domain: "shopeepay.vn", category: "fintech_vn", country: "VN", trustScore: 92, note: "ShopeePay" },
  { domain: "grab.com", category: "fintech_vn", country: "GLOBAL", trustScore: 90, note: "Grab" },
  { domain: "mservice.com.vn", category: "fintech_vn", country: "VN", trustScore: 95, note: "M_Service (MoMo parent)" },
  { domain: "payoo.vn", category: "fintech_vn", country: "VN", trustScore: 90, note: "Payoo" },

  // ============================================================
  // NHÓM 5: THƯƠNG MẠI ĐIỆN TỬ UY TÍN
  // ============================================================
  { domain: "shopee.vn", category: "ecom_vn", country: "VN", trustScore: 90, note: "Shopee Việt Nam" },
  { domain: "lazada.vn", category: "ecom_vn", country: "VN", trustScore: 90, note: "Lazada Việt Nam" },
  { domain: "tiki.vn", category: "ecom_vn", country: "VN", trustScore: 90, note: "Tiki" },
  { domain: "sendo.vn", category: "ecom_vn", country: "VN", trustScore: 85, note: "Sendo" },
  { domain: "thegioididong.com", category: "ecom_vn", country: "VN", trustScore: 92, note: "Thế Giới Di Động" },
  { domain: "cellphones.com.vn", category: "ecom_vn", country: "VN", trustScore: 90, note: "CellphoneS" },
  { domain: "fptshop.com.vn", category: "ecom_vn", country: "VN", trustScore: 90, note: "FPT Shop" },
  { domain: "dienmayxanh.com", category: "ecom_vn", country: "VN", trustScore: 92, note: "Điện Máy Xanh" },

  // ============================================================
  // NHÓM 6: VIỄN THÔNG VIỆT NAM
  // ============================================================
  { domain: "mobifone.vn", category: "telecom_vn", country: "VN", trustScore: 95, note: "MobiFone" },
  { domain: "vinaphone.vn", category: "telecom_vn", country: "VN", trustScore: 95, note: "VinaPhone" },
  { domain: "vietnamobile.com.vn", category: "telecom_vn", country: "VN", trustScore: 90, note: "Vietnamobile" },
  { domain: "fpt.vn", category: "telecom_vn", country: "VN", trustScore: 92, note: "FPT Telecom" },
  { domain: "vnpt.vn", category: "telecom_vn", country: "VN", trustScore: 95, note: "VNPT" },
  { domain: "vietpost.vn", category: "telecom_vn", country: "VN", trustScore: 90, note: "Viettel Post" },

  // ============================================================
  // NHÓM 7: GIÁO DỤC VIỆT NAM
  // ============================================================
  { domain: "hust.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Bách Khoa Hà Nội" },
  { domain: "vnu.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Quốc gia Hà Nội" },
  { domain: "vnuhcm.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Quốc gia TP.HCM" },
  { domain: "hcmus.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Khoa học Tự nhiên" },
  { domain: "hcmut.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Bách Khoa TP.HCM" },
  { domain: "ueh.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Kinh tế TP.HCM" },
  { domain: "neu.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Kinh tế Quốc dân" },
  { domain: "ftu.edu.vn", category: "edu_vn", country: "VN", trustScore: 95, note: "ĐH Ngoại Thương" },

  // ============================================================
  // NHÓM 8: Y TẾ VIỆT NAM
  // ============================================================
  { domain: "vinmec.com", category: "health_vn", country: "VN", trustScore: 95, note: "Vinmec" },
  { domain: "bachmai.gov.vn", category: "health_vn", country: "VN", trustScore: 100, note: "BV Bạch Mai" },
  { domain: "choyray.com.vn", category: "health_vn", country: "VN", trustScore: 100, note: "BV Chợ Rẫy" },
  { domain: "108-ictu.edu.vn", category: "health_vn", country: "VN", trustScore: 100, note: "BV 108" },
  { domain: "medlatec.vn", category: "health_vn", country: "VN", trustScore: 90, note: "MEDLATEC" },
  { domain: "hellobacsi.com", category: "health_vn", country: "VN", trustScore: 85, note: "Hello Bác Sĩ" },
  { domain: "thuocbietduoc.com.vn", category: "health_vn", country: "VN", trustScore: 88, note: "Thuốc Biệt Dược" },

  // ============================================================
  // NHÓM 9: CƠ QUAN QUỐC TẾ UY TÍN
  // ============================================================
  { domain: "who.int", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "Tổ chức Y tế Thế giới" },
  { domain: "un.org", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "Liên Hợp Quốc" },
  { domain: "worldbank.org", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "Ngân hàng Thế giới" },
  { domain: "imf.org", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "IMF" },
  { domain: "unicef.org", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "UNICEF" },
  { domain: "undp.org", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "UNDP" },
  { domain: "asean.org", category: "gov_global", country: "GLOBAL", trustScore: 98, note: "ASEAN" },
  { domain: "interpol.int", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "INTERPOL" },
  { domain: "gov.uk", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "Chính phủ Anh" },
  { domain: "whitehouse.gov", category: "gov_global", country: "GLOBAL", trustScore: 100, note: "Nhà Trắng Mỹ" },

  // ============================================================
  // NHÓM 10: BÁO CHÍ QUỐC TẾ UY TÍN
  // ============================================================
  { domain: "reuters.com", category: "media_global", country: "GLOBAL", trustScore: 98, note: "Reuters" },
  { domain: "apnews.com", category: "media_global", country: "GLOBAL", trustScore: 98, note: "AP News" },
  { domain: "afp.com", category: "media_global", country: "GLOBAL", trustScore: 98, note: "AFP" },
  { domain: "bbc.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "BBC" },
  { domain: "cnn.com", category: "media_global", country: "GLOBAL", trustScore: 90, note: "CNN" },
  { domain: "nytimes.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "New York Times" },
  { domain: "theguardian.com", category: "media_global", country: "GLOBAL", trustScore: 92, note: "The Guardian" },
  { domain: "wsj.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "Wall Street Journal" },
  { domain: "ft.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "Financial Times" },
  { domain: "bloomberg.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "Bloomberg" },
  { domain: "economist.com", category: "media_global", country: "GLOBAL", trustScore: 95, note: "The Economist" },
  { domain: "voanews.com", category: "media_global", country: "GLOBAL", trustScore: 90, note: "VOA" },
  { domain: "rfa.org", category: "media_global", country: "GLOBAL", trustScore: 85, note: "RFA" },
  { domain: "nhk.or.jp", category: "media_global", country: "GLOBAL", trustScore: 95, note: "NHK" },
  { domain: "dw.com", category: "media_global", country: "GLOBAL", trustScore: 92, note: "Deutsche Welle" },
  { domain: "france24.com", category: "media_global", country: "GLOBAL", trustScore: 92, note: "France 24" },

  // ============================================================
  // NHÓM 11: TỔ CHỨC KIỂM CHỨNG SỰ THẬT (FACT-CHECK)
  // ============================================================
  { domain: "factcheck.org", category: "factcheck", country: "GLOBAL", trustScore: 98, note: "FactCheck.org" },
  { domain: "snopes.com", category: "factcheck", country: "GLOBAL", trustScore: 92, note: "Snopes" },
  { domain: "politifact.com", category: "factcheck", country: "GLOBAL", trustScore: 92, note: "PolitiFact" },
  { domain: "fullfact.org", category: "factcheck", country: "GLOBAL", trustScore: 92, note: "Full Fact" },
  { domain: "factcheckvn.vn", category: "factcheck", country: "VN", trustScore: 95, note: "Fact-check Việt Nam" },
  { domain: "tingia.gov.vn", category: "factcheck", country: "VN", trustScore: 100, note: "Cổng kiểm tin Chính phủ" },
  { domain: "google.com/factcheck", category: "factcheck", country: "GLOBAL", trustScore: 98, note: "Google Fact Check" },
  { domain: "ifcncodeofprinciples.poynter.org", category: "factcheck", country: "GLOBAL", trustScore: 98 },

  // ============================================================
  // NHÓM 12: CÔNG NGHỆ LỚN TOÀN CẦU
  // ============================================================
  { domain: "google.com", category: "tech_global", country: "GLOBAL", trustScore: 95, note: "Google" },
  { domain: "microsoft.com", category: "tech_global", country: "GLOBAL", trustScore: 95, note: "Microsoft" },
  { domain: "apple.com", category: "tech_global", country: "GLOBAL", trustScore: 95, note: "Apple" },
  { domain: "meta.com", category: "tech_global", country: "GLOBAL", trustScore: 85, note: "Meta (Facebook)" },
  { domain: "facebook.com", category: "tech_global", country: "GLOBAL", trustScore: 80, note: "Facebook" },
  { domain: "twitter.com", category: "tech_global", country: "GLOBAL", trustScore: 75, note: "Twitter/X" },
  { domain: "x.com", category: "tech_global", country: "GLOBAL", trustScore: 75, note: "X (Twitter)" },
  { domain: "youtube.com", category: "tech_global", country: "GLOBAL", trustScore: 80, note: "YouTube" },
  { domain: "amazon.com", category: "tech_global", country: "GLOBAL", trustScore: 90, note: "Amazon" },
  { domain: "zalo.me", category: "tech_global", country: "VN", trustScore: 88, note: "Zalo" },
  { domain: "tiktok.com", category: "tech_global", country: "GLOBAL", trustScore: 72, note: "TikTok" },

  // ============================================================
  // NHÓM 13: BẢO MẬT & CHỨNG NHẬN
  // ============================================================
  { domain: "virustotal.com", category: "security", country: "GLOBAL", trustScore: 98, note: "VirusTotal" },
  { domain: "phishtank.com", category: "security", country: "GLOBAL", trustScore: 95, note: "PhishTank" },
  { domain: "openphish.com", category: "security", country: "GLOBAL", trustScore: 95, note: "OpenPhish" },
  { domain: "haveibeenpwned.com", category: "security", country: "GLOBAL", trustScore: 95, note: "Have I Been Pwned" },
  { domain: "abuseipdb.com", category: "security", country: "GLOBAL", trustScore: 90, note: "AbuseIPDB" },
  { domain: "malwarebytes.com", category: "security", country: "GLOBAL", trustScore: 92, note: "Malwarebytes" },
  { domain: "kaspersky.com", category: "security", country: "GLOBAL", trustScore: 88, note: "Kaspersky" },
  { domain: "mcafee.com", category: "security", country: "GLOBAL", trustScore: 88, note: "McAfee" },
  { domain: "trendmicro.com", category: "security", country: "GLOBAL", trustScore: 90, note: "Trend Micro" },
  { domain: "eset.com", category: "security", country: "GLOBAL", trustScore: 90, note: "ESET" },
];

// Helper functions
export function isDomainTrusted(url: string): TrustedDomain | null {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");

    // Exact match
    const exactMatch = TRUSTED_DOMAINS.find(d => d.domain === hostname);
    if (exactMatch) return exactMatch;

    // Subdomain match (e.g., nacis.gov.vn matches any *.gov.vn parent)
    const parentMatch = TRUSTED_DOMAINS.find(d =>
      hostname.endsWith(`.${d.domain}`) || hostname === d.domain
    );
    return parentMatch || null;
  } catch {
    return null;
  }
}

export function getDomainTrustScore(url: string): number {
  const trusted = isDomainTrusted(url);
  return trusted ? trusted.trustScore : 0;
}

export function isGovVnDomain(url: string): boolean {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(normalizedUrl).hostname.toLowerCase();
    return hostname.endsWith(".gov.vn") || hostname === "gov.vn";
  } catch {
    return false;
  }
}

export function isSuspiciousTLD(url: string): boolean {
  const suspiciousTLDs = [
    ".ml", ".ga", ".cf", ".gq", ".tk",
    ".xyz", ".top", ".icu", ".cc", ".biz",
    ".click", ".link", ".today", ".online",
    ".space", ".pw", ".su", ".to",
    ".work", ".site", ".website"
  ];
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(normalizedUrl).hostname.toLowerCase();
    return suspiciousTLDs.some(tld => hostname.endsWith(tld));
  } catch {
    return false;
  }
}

export function extractLinksFromText(text: string): string[] {
  const linkPattern = /(https?:\/\/[^\s]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  return text.match(linkPattern) || [];
}
