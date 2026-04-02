import { motion, AnimatePresence } from "motion/react";
import { Shield, ChevronRight, Menu, X, Search, Command, CheckCircle2, AlertTriangle, Globe, ShieldCheck, Database, ExternalLink, Loader2, Sparkles, Zap, User, Heart, Target, Users } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("home"); // "home" or "check"
  const [searchQuery, setSearchQuery] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [checkType, setCheckType] = useState<"web" | "news">("web");

  const handleCheck = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsChecking(true);
    setShowResults(false);
    setCurrentPage("check");
    setLoadingStep(0);

    // Simulate steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 600);

    // Simulate check process
    setTimeout(() => {
      clearInterval(stepInterval);
      setIsChecking(false);
      setShowResults(true);
      // Randomize result for demo
      const isSafe = Math.random() > 0.3;
      
      const webReasons = [
        { name: "Chứng chỉ SSL/TLS", status: "success", detail: "Hợp lệ & Bảo mật", icon: ShieldCheck },
        { name: "Tuổi đời tên miền", status: isSafe ? "success" : "warning", detail: isSafe ? "> 5 năm" : "< 1 tháng", icon: Globe },
        { name: "Danh sách đen (Blacklist)", status: isSafe ? "success" : "danger", detail: isSafe ? "Sạch" : "Phát hiện lừa đảo", icon: AlertTriangle },
        { name: "Mã độc (Malware)", status: isSafe ? "success" : "danger", detail: isSafe ? "Không tìm thấy" : "Phát hiện Script lạ", icon: Database },
        { name: "Tấn công Phishing", status: isSafe ? "success" : "danger", detail: isSafe ? "Không có dấu hiệu" : "Giả mạo thương hiệu", icon: Search },
        { name: "Độ tin cậy cộng đồng", status: isSafe ? "success" : "warning", detail: isSafe ? "Cao" : "Thấp/Chưa xác minh", icon: Globe },
        { name: "Máy chủ lưu trữ", status: "success", detail: "Vị trí an toàn", icon: Database },
        { name: "Chỉ số rủi ro hệ thống", status: isSafe ? "success" : "danger", detail: isSafe ? "Thấp (2%)" : "Rất cao (94%)", icon: Sparkles }
      ];

      const newsReasons = [
        { name: "Nguồn tin xác thực", status: isSafe ? "success" : "danger", detail: isSafe ? "Cơ quan báo chí chính thống" : "Nguồn tin không xác định", icon: Globe },
        { name: "Kiểm chứng chéo", status: isSafe ? "success" : "warning", detail: isSafe ? "Khớp với 10+ nguồn tin khác" : "Chưa có nguồn tin đối chứng", icon: Search },
        { name: "Phân tích ngôn ngữ chuyên sâu", status: isSafe ? "success" : "danger", detail: isSafe ? "Ngôn ngữ khách quan" : "Ngôn ngữ kích động/Giật gân", icon: Sparkles },
        { name: "Dấu hiệu chỉnh sửa ảnh", status: isSafe ? "success" : "warning", detail: isSafe ? "Ảnh gốc/Chưa qua chỉnh sửa" : "Phát hiện dấu hiệu Deepfake/Chỉnh sửa", icon: ShieldCheck },
        { name: "Thời gian đăng tải", status: "success", detail: "Cập nhật thời gian thực", icon: Database },
        { name: "Uy tín tác giả", status: isSafe ? "success" : "warning", detail: isSafe ? "Tác giả có chuyên môn" : "Tác giả ẩn danh/Mới tạo", icon: ShieldCheck }
      ];

      setResultData({
        isSafe,
        type: checkType,
        url: searchQuery,
        score: isSafe ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 20) + 5,
        confidence: isSafe ? "98%" : "Phát hiện mã độc lớp sâu",
        title: isSafe 
          ? (checkType === "web" ? "Trang chủ - Ngân hàng ABC" : "Thông tin chính thống từ Chính phủ") 
          : (checkType === "web" ? "CẢNH BÁO: Trang web giả mạo" : "CẢNH BÁO: Tin giả đang lan truyền"),
        description: isSafe 
          ? (checkType === "web" ? "Trang web chính thức của Ngân hàng ABC. An toàn cho giao dịch." : "Nội dung đã được kiểm chứng bởi các cơ quan chức năng.") 
          : (checkType === "web" ? "Trang web này có dấu hiệu lừa đảo chiếm đoạt thông tin tài khoản ngân hàng." : "Nội dung này chứa thông tin sai lệch, gây hoang mang dư luận."),
        screenshot: isSafe 
          ? (checkType === "web" ? "https://picsum.photos/seed/safe/800/1200" : "https://picsum.photos/seed/news_safe/800/1200") 
          : (checkType === "web" ? "https://picsum.photos/seed/danger/800/1200" : "https://picsum.photos/seed/news_danger/800/1200"),
        analysisReasons: checkType === "web" ? webReasons : newsReasons,
        textContent: searchQuery
      });
    }, 2500);
  };

  const navLinks = [
    { name: "Trang Chủ", id: "home" },
    { name: "Kiểm Tra", id: "check" },
    { name: "Tài Nguyên", id: "resources" },
    { name: "Đồng hành", id: "partners" },
    { name: "Sứ mệnh", id: "mission" },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1A] selection:bg-purple-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[27px] tracking-tight">Lá Chắn Số</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <button
                key={link.name}
                onClick={() => {
                  if (link.id === "home" || link.id === "check" || link.id === "partners" || link.id === "resources" || link.id === "mission") {
                    setCurrentPage(link.id);
                    if (link.id === "home") {
                      setShowResults(false);
                      setSearchQuery("");
                    }
                    setIsMenuOpen(false);
                  }
                }}
                className={`font-medium transition-colors ${
                  currentPage === link.id ? "text-black" : "text-gray-600 hover:text-black"
                } ${index === 0 ? 'text-[19px]' : 'text-[20px]'}`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage("check")}
              className="hidden md:block px-6 py-2.5 bg-[#1A1A1A] text-white text-base font-semibold rounded-full hover:bg-gray-800 transition-all active:scale-95"
            >
              Kiểm Tra Ngay
            </button>
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl"
          >
            {navLinks.map((link) => (
              <button
                key={link.name}
                className={`text-lg font-medium text-left ${
                  currentPage === link.id ? "text-black" : "text-gray-600"
                }`}
                onClick={() => {
                  if (link.id === "home" || link.id === "check" || link.id === "partners" || link.id === "resources" || link.id === "mission") {
                    setCurrentPage(link.id);
                  }
                  setIsMenuOpen(false);
                }}
              >
                {link.name}
              </button>
            ))}
            <button 
              onClick={() => {
                setCurrentPage("check");
                setIsMenuOpen(false);
              }}
              className="w-full px-6 py-3 bg-[#1A1A1A] text-white font-semibold rounded-full mt-2"
            >
              Kiểm Tra Ngay
            </button>
          </motion.div>
        )}
      </nav>

      <AnimatePresence mode="wait">
        {currentPage === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero Section */}
            <main className="pt-32 pb-20 px-6">
              <div className="max-w-[1600px] mx-auto">
                <div className="relative rounded-[40px] overflow-hidden bg-[#E8E8ED] w-full max-w-[1600px] h-[768.767px] flex flex-col items-center justify-center text-center px-6 mx-auto">
                  {/* Background Image Overlay */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src="https://i.postimg.cc/Ls0LBMvc/image.png?auto=format&fit=crop&q=80&w=2000" 
                      alt="Background" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Content */}
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-10 max-w-3xl pb-[300px]"
                  >
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-[18px] leading-[1.1] italic">
                      Lá Chắn Số
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-600 mt-0 mb-[30px] leading-relaxed max-w-2xl mx-auto">
                      Lá chắn số trước những cạm bẫy không gian mạng.
                    </p>

                    <div className="flex items-center justify-center gap-4 mb-6">
                      <button 
                        onClick={() => setCheckType("web")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                          checkType === "web" 
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200" 
                            : "bg-white/60 text-gray-600 hover:bg-white"
                        }`}
                      >
                        Kiểm tra Web
                      </button>
                      <button 
                        onClick={() => setCheckType("news")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                          checkType === "news" 
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200" 
                            : "bg-white/60 text-gray-600 hover:bg-white"
                        }`}
                      >
                        Kiểm tra Tin giả
                      </button>
                    </div>

                    <form onSubmit={handleCheck} className="relative w-full max-w-2xl mx-auto mt-8">
                      <div className="relative flex items-center w-full h-16 px-8 bg-white/60 backdrop-blur-md border-2 border-purple-400/40 rounded-full shadow-lg group transition-all hover:bg-white/80 hover:border-purple-500/60">
                        <input 
                          type="text" 
                          placeholder="Nhập đường dẫn, văn bản cần kiểm tra"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-lg"
                        />
                        <button type="submit" disabled={isChecking}>
                          {isChecking ? (
                            <Loader2 className="w-6 h-6 text-purple-600 animate-spin ml-3" />
                          ) : (
                            <Search className="w-6 h-6 text-purple-600 ml-3 cursor-pointer hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </div>
            </main>

            {/* Info Section */}
            <section className="py-24 px-6 bg-white w-full max-w-[1572.67px] min-h-[1190.22px] mx-auto">
              <div className="w-full">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                  <div className="max-w-xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Lá Chắn Số là gì?</h2>
                    <button className="px-8 py-3 bg-[#1A1A1A] text-white font-semibold rounded-full hover:bg-gray-800 transition-all active:scale-95">
                      Tìm hiểu thêm
                    </button>
                  </div>
                  <div className="max-w-md">
                    <p className="text-lg text-gray-600 leading-relaxed">
                      Lá Chắn Số: Định nghĩa lại sự an toàn trực tuyến. Chúng tôi xây dựng một lớp lọc thông tin minh bạch, giúp người dùng phân định giữa thực tại - tin giả và chống khỏi lừa đảo . Một giải pháp bảo mật tinh gọn, hiệu quả và luôn sẵn sàng bảo vệ bạn.
                    </p>
                  </div>
                </div>

                {/* Grid Section */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.15,
                      },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
                >
                  {/* Large Card */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="md:col-span-2 relative rounded-[32px] overflow-hidden bg-[#E8E8ED] p-10 min-h-[400px] flex flex-col justify-between group"
                  >
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-4">CÔNG NGHỆ XÁC THỰC LỚP SÂU</h3>
                      <p className="text-gray-600 max-w-2xl">
                       Lá Chắn Số vận hành trên nền tảng phân tích đa tầng, cho phép bóc tách dữ liệu và nhận diện hành vi độc hại trong thời gian thực. Bằng cách kết hợp thuật toán thông minh và mạng lưới dữ liệu thực thi, chúng tôi kiến tạo một lớp lọc minh bạch giúp bạn phân định xác thực giữa thực tại và tin giả. Đây là giải pháp bảo mật tinh gọn, chủ động ngăn chặn lừa đảo và bảo vệ an toàn tuyệt đối cho hành trình số của bạn.
                      </p>
                    </div>
                  </motion.div>

                  {/* Small Card 1 */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#1A1A1A] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">QUY CHUẨN & NỀN TẢNG RIÊNG</h3>
                    </div>
                    <p className="text-gray-400">
                      Thiết lập bộ quy tắc đánh giá độc lập kết hợp công nghệ nội bộ. Đảm bảo mọi thông tin đều được gán nhãn minh bạch dựa trên cơ sở khoa học và pháp lý.
                    </p>
                  </motion.div>

                  {/* Small Card 2 */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#2D2D35] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">DỮ LIỆU THỰC THI</h3>
                    </div>
                    <p className="text-gray-400">
                     Kết nối mạng lưới dữ liệu từ các cộng đồng bảo mật uy tín. Mọi cảnh báo đều dựa trên sự đối soát thực tế, kiến tạo một bản đồ an toàn cho người dùng Việt.
                    </p>
                  </motion.div>

                  {/* Small Card 3 */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#3D3D45] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">TRẢI NGHIỆM AN TOÀN</h3>
                    </div>
                    <p className="text-gray-400">
                      Thiết kế tinh gọn, ưu tiên sự đơn giản và minh bạch trong mọi tương tác. Lá Chắn Số không chỉ bảo vệ dữ liệu, mà còn kiến tạo một môi trường số đáng tin cậy, giúp bạn luôn tự tin và an tâm trên hành trình trực tuyến.
                    </p>
                  </motion.div>

                  {/* Small Card 4 */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#4D4D55] p-10 flex flex-col justify-between h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">TIẾN HÓA LIÊN TỤC</h3>
                    </div>
                    <p className="text-gray-400">
                     Hệ thống kết nối mạng lưới dữ liệu động, liên tục cập nhật và vô hiệu hóa các phương thức lừa đảo mới nhất từ cộng đồng. Bằng cách hợp nhất các nguồn tin thực thi, Lá Chắn Số kiến tạo một lớp phòng thủ chủ động, giúp bạn đi trước kẻ xấu một bước trên mọi nền tảng số.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* Global Threat Map Section */}
            <section className="py-24 bg-[#F9F9FB] text-[#1A1A1A] overflow-hidden border-t border-gray-100">
              <div className="w-full relative">
                <div className="flex flex-col items-center text-center mb-16 relative z-10">
                  <motion.span 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-purple-600 font-mono text-sm tracking-[0.2em] uppercase mb-4"
                  >
                    Mạng lưới giám sát toàn cầu
                  </motion.span>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                  >
                    Tin giả và lừa đảo có ở khắp mọi nơi
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 max-w-2xl text-lg"
                  >
                    Lá Chắn Số kết nối với các trung tâm dữ liệu bảo mật trên toàn thế giới để cập nhật và ngăn chặn các mối đe dọa xuyên biên giới trong thời gian thực.
                  </motion.p>
                </div>

                {/* World Map Container */}
                <div className="relative w-full aspect-[2/1] mx-auto">
                  {/* Detailed World Map Image (Black on Light) */}
                  <div className="absolute inset-0 z-0 opacity-100">
                    <img 
                      src="https://i.postimg.cc/6QyyKbNd/image.png" 
                      alt="Detailed World Map" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Logo Marquee Section */}
            <section className="py-20 bg-white border-t border-gray-100 overflow-hidden">
              <div className="max-w-[1600px] mx-auto px-6 mb-12 text-center">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-8">Đồng hành cùng các đơn vị uy tín</h3>
              </div>
              
              <div className="relative flex overflow-x-hidden">
                <div className="flex animate-marquee whitespace-nowrap py-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-24 mx-12">
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">DNS-BLOCKLISTS</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">MALWARE-FILTER</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">TINGIA.GOV</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">VNEXPRESS</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">TUỔI TRẺ</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">BÁO THANH NIÊN</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">DANTRI</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">PhishTank</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">Google Fact</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">Google News</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">GITHUB COMMUNITY</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">OpenPhish</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">The New York Times</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">CNN</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">AFP</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">AP News</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === "check" && (
          <motion.div
            key="check"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Trung Tâm Kiểm Tra An Toàn</h2>
                <p className="text-gray-500">Phân tích URL, tệp tin và nội dung nghi ngờ bằng công nghệ Sandbox độc quyền.</p>
              </div>

              <div className="flex items-center justify-center gap-4 mb-8">
                <button 
                  onClick={() => setCheckType("web")}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    checkType === "web" 
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200" 
                      : "bg-white/60 text-gray-600 hover:bg-white border border-gray-100"
                  }`}
                >
                  Kiểm tra Web
                </button>
                <button 
                  onClick={() => setCheckType("news")}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    checkType === "news" 
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200" 
                      : "bg-white/60 text-gray-600 hover:bg-white border border-gray-100"
                  }`}
                >
                  Kiểm tra Tin giả
                </button>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleCheck} className="relative max-w-3xl mx-auto mb-16">
                <div className="relative flex items-center w-full h-16 px-8 bg-white/60 backdrop-blur-md border-2 border-purple-400/40 rounded-full shadow-lg group transition-all hover:bg-white/80 hover:border-purple-500/60">
                  <input 
                    type="text" 
                    placeholder="Nhập đường dẫn, văn bản cần kiểm tra"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-lg"
                  />
                  <button type="submit" disabled={isChecking}>
                    {isChecking ? (
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin ml-3" />
                    ) : (
                      <Search className="w-6 h-6 text-purple-600 ml-3 cursor-pointer hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </form>

              {/* Results Area */}
              <div className="w-full">
                {isChecking ? (
                  // Enhanced Loading State
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-12 shadow-2xl text-center"
                  >
                    <div className="relative w-32 h-32 mx-auto mb-12">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-dashed border-purple-200 rounded-full"
                      />
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border-4 border-purple-500 border-t-transparent rounded-full flex items-center justify-center"
                      >
                        <Shield className="w-8 h-8 text-purple-600 transform rotate-[360deg] animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="space-y-6 max-w-md mx-auto">
                      {[
                        { icon: Search, label: "Phân tích mã nguồn" },
                        { icon: Database, label: "Kiểm tra cơ sở dữ liệu" },
                        { icon: Globe, label: "Mô phỏng Sandbox" },
                        { icon: ShieldCheck, label: "Xác thực kết quả" }
                      ].map((step, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-center gap-4 transition-all duration-500 ${
                            idx === loadingStep ? "opacity-100 scale-105" : idx < loadingStep ? "opacity-40" : "opacity-20"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${idx === loadingStep ? "bg-purple-100" : "bg-gray-100"}`}>
                            {idx === loadingStep ? (
                              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                            ) : idx < loadingStep ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <step.icon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className={`font-medium ${idx === loadingStep ? "text-purple-900" : "text-gray-600"}`}>
                            {step.label}
                            {idx === loadingStep && "..."}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12">
                      <p className="text-sm text-purple-600 font-mono animate-pulse uppercase tracking-widest">
                        Hệ thống đang quét lớp sâu
                      </p>
                    </div>
                  </motion.div>
                ) : showResults && resultData ? (
                  // Actual Results - Three Column Layout
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Verdict & Analysis */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col items-center text-center"
                    >
                      <h4 className="text-lg font-bold mb-6 text-gray-800">Kết quả từ Lá Chắn Số</h4>
                      
                      <div className="relative w-40 h-40 mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-gray-100"
                          />
                          <motion.circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={440}
                            initial={{ strokeDashoffset: 440 }}
                            animate={{ strokeDashoffset: 440 - (440 * resultData.score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={resultData.isSafe ? "text-green-500" : "text-red-500"}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-gray-900">{resultData.score}%</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tin cậy</span>
                        </div>
                      </div>

                      <div className={`w-full py-4 rounded-2xl mb-8 flex items-center justify-center gap-2 ${
                        resultData.isSafe ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                      }`}>
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xl font-black tracking-wider">
                          {resultData.isSafe ? "AN TOÀN" : "NGUY HIỂM"}
                        </span>
                      </div>

                      <div className="w-full space-y-3 mb-8">
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span>Mức độ rủi ro</span>
                          <span className={resultData.isSafe ? "text-green-500" : "text-red-500"}>
                            {resultData.isSafe ? "Thấp" : "Rất cao"}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - resultData.score}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full ${resultData.isSafe ? "bg-green-500" : "bg-red-500"}`}
                          />
                        </div>
                      </div>

                      <div className="mt-auto pt-8 w-full">
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3 text-left">
                          <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-blue-900">Xác thực chuyên gia</p>
                            <p className="text-xs text-blue-700/70">Được xác nhận bởi mạng lưới 500+ chuyên gia bảo mật.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Column 2: Analysis Reasons */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm"
                    >
                      <h4 className="text-lg font-bold mb-8 text-gray-800">Lý do phân tích</h4>
                      
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {resultData.analysisReasons.map((res: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0 group">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              res.status === "danger" ? "bg-red-50 text-red-500" : 
                              res.status === "warning" ? "bg-orange-50 text-orange-500" : 
                              "bg-green-50 text-green-500"
                            }`}>
                              <res.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-bold text-gray-800 truncate">{res.name}</span>
                                {res.status === "danger" ? (
                                  <X className="w-4 h-4 text-red-500" />
                                ) : res.status === "warning" ? (
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <p className={`text-xs font-medium ${
                                res.status === "danger" ? "text-red-500" : 
                                res.status === "warning" ? "text-orange-500" : 
                                "text-green-600"
                              }`}>
                                {res.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Column 3: Screenshot Preview */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-lg font-bold text-gray-800">
                          {resultData.type === "news" ? "Thông tin văn bản" : "Xem trước an toàn"}
                        </h4>
                        <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          {resultData.type === "news" ? "TEXT ANALYSIS" : "SANDBOX LIVE"}
                        </div>
                      </div>
                      
                      <div className="relative flex-1 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group min-h-[400px] shadow-inner">
                        {resultData.type === "news" ? (
                          <div className="p-6 h-full bg-white overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-2 h-2 bg-red-400 rounded-full" />
                              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                              <div className="w-2 h-2 bg-green-400 rounded-full" />
                            </div>
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                                {resultData.textContent}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={resultData.screenshot} 
                              alt="Screenshot" 
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-red-400 rounded-full" />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                              </div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{resultData.title}</p>
                              <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{resultData.description}</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{resultData.url}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-600">Protected</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-50">
                        <button className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                          <ExternalLink className="w-4 h-4" />
                          {resultData.type === "news" ? "Xem nguồn tin gốc" : "Truy cập an toàn (Sandbox)"}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  // Initial State
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu kiểm tra</h3>
                    <p className="text-gray-400">Vui lòng nhập URL để bắt đầu phân tích an toàn.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === "partners" && (
          <motion.div
            key="partners"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
                >
                  Mạng lưới hợp tác
                </motion.span>
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">Đồng hành cùng Lá Chắn Số</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                  Chúng tôi tự hào được đồng hành cùng các tổ chức bảo mật toàn cầu, cơ quan báo chí và đơn vị xác thực uy tín để kiến tạo một không gian mạng an toàn.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-12">
                {/* Group 1 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 1: Global Security Intelligence</h3>
                    <p className="text-purple-600 font-medium">(Dữ liệu bảo mật)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["DNS-BLOCKLISTS", "MALWARE-FILTER", "PhishTank", "OpenPhish", "GITHUB COMMUNITY"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group 2 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 2: Fact-Check & Global Media</h3>
                    <p className="text-purple-600 font-medium">(Xác thực & Báo chí quốc tế)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["Google Fact", "Google News", "AP News", "AFP", "CNN", "The New York Times"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group 3 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 3: Vietnam Verification Hub</h3>
                    <p className="text-purple-600 font-medium">(Tin tức & Xác thực Việt Nam)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["TINGIA.GOV", "VNEXPRESS", "TUỔI TRẺ", "BÁO THANH NIÊN", "DANTRI"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
                >
                  Trung tâm tài nguyên
                </motion.span>
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">Dữ liệu cảnh báo</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                  Danh sách các trang web lừa đảo và tin giả được hệ thống Lá Chắn Số cập nhật liên tục để bảo vệ người dùng.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scam Websites Table */}
                <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Trang web lừa đảo</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-red-50">
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">STT</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Link trang</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50/30">
                        {[
                          { id: 1, link: "shopee-khuyenmai-2026.com", date: "02/04" },
                          { id: 2, link: "nganhang-abc-login.net", date: "01/04" },
                          { id: 3, link: "nhan-qua-mien-phi.org", date: "31/03" },
                          { id: 4, link: "facebook-verify-account.com", date: "30/03" },
                          { id: 5, link: "crypto-invest-bonus.io", date: "29/03" },
                        ].map((item) => (
                          <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                            <td className="py-4 font-medium text-gray-900 text-sm">{item.id}</td>
                            <td className="py-4 text-red-600 font-medium hover:underline cursor-pointer text-sm truncate max-w-[150px]">{item.link}</td>
                            <td className="py-4 text-gray-500 text-sm">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fake News Table */}
                <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <Sparkles className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Tin giả cảnh báo</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-red-50">
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">STT</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Tiêu đề tin</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50/30">
                        {[
                          { id: 1, title: "Phong tỏa tài khoản ngân hàng hàng loạt", date: "02/04" },
                          { id: 2, title: "Thông tin sai về chính sách hỗ trợ mới", date: "01/04" },
                          { id: 3, title: "Tin đồn thất thiệt về dịch bệnh", date: "31/03" },
                          { id: 4, title: "Giả mạo văn bản xử phạt giao thông", date: "30/03" },
                          { id: 5, title: "Tin giả về chương trình tặng quà tri ân", date: "29/03" },
                        ].map((item) => (
                          <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                            <td className="py-4 font-medium text-gray-900 text-sm">{item.id}</td>
                            <td className="py-4 text-gray-800 font-medium text-sm line-clamp-1">{item.title}</td>
                            <td className="py-4 text-gray-500 text-sm">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === "mission" && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 min-h-screen bg-white"
          >
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 text-center py-24 border-b border-gray-100">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center mb-8"
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full border border-red-100">
                  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-sm">
                    <rect width="24" height="16" fill="#DA251D"/>
                    <path d="M12 4L13.1756 7.61803H16.9789L13.9016 9.8541L15.0773 13.4721L12 11.2361L8.92272 13.4721L10.0984 9.8541L7.02114 7.61803H10.8244L12 4Z" fill="#FFFF00"/>
                  </svg>
                  <span className="text-red-600 font-bold text-sm tracking-wide uppercase">Khát vọng Việt</span>
                </div>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-6xl md:text-8xl font-bold tracking-tighter mb-12 leading-[0.9]"
              >
                Lá Chắn Số bảo vệ <br /> thế giới số của bạn.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed"
              >
                Nền tảng của chúng tôi cung cấp giải pháp xác thực và bảo mật để xây dựng, mở rộng và <span className="text-purple-600 font-semibold">bảo vệ</span> một không gian mạng an toàn, tin cậy hơn cho người dùng Việt Nam.
              </motion.p>
            </div>

            {/* Values Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 border-b border-gray-100">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="p-12 border-b md:border-b-0 md:border-r border-gray-100 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Dễ dàng.</span> Kiểm tra và xác thực thông tin chỉ với một cú chạm đơn giản.
                </h3>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="p-12 border-b md:border-b-0 md:border-r border-gray-100 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <Globe className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Toàn diện.</span> Kết nối dữ liệu bảo mật toàn cầu, bảo vệ bạn ở mọi nơi.
                </h3>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="p-12 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Tin cậy.</span> Sự tỉ mỉ trong phân tích và công nghệ hiện đại giúp mọi người an tâm hơn.
                </h3>
              </motion.div>
            </div>

            {/* Detailed Mission Section */}
            <div className="max-w-7xl mx-auto px-6 py-32 border-b border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div>
                  <motion.span 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-6 block"
                  >
                    Tầm nhìn chiến lược
                  </motion.span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-tight">
                    Kiến tạo hệ sinh thái <br /> tín nhiệm số quốc gia.
                  </h2>
                  <div className="space-y-8">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Mục tiêu 2030</h4>
                        <p className="text-gray-500 leading-relaxed">Trở thành nền tảng xác thực tin cậy hàng đầu, bảo vệ 100% người dùng internet Việt Nam khỏi các mối đe dọa lừa đảo trực tuyến.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Vì cộng đồng</h4>
                        <p className="text-gray-500 leading-relaxed">Xây dựng cộng đồng cùng nhau chia sẻ và cảnh báo các dấu hiệu lừa đảo, tạo nên một "lá chắn" vững chắc từ chính sức mạnh tập thể.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Trách nhiệm xã hội</h4>
                        <p className="text-gray-500 leading-relaxed">Hỗ trợ các đối tượng yếu thế, người cao tuổi và trẻ em nâng cao kỹ năng nhận diện và phòng chống tội phạm mạng.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-red-50 rounded-[60px] overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-64 h-64">
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 10, repeat: Infinity }}
                          className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-full border border-white/50"
                        />
                        <Shield className="absolute inset-0 m-auto w-32 h-32 text-purple-600 opacity-20" />
                        <div className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center">
                          <svg width="60" height="40" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
                            <rect width="24" height="16" fill="#DA251D"/>
                            <path d="M12 4L13.1756 7.61803H16.9789L13.9016 9.8541L15.0773 13.4721L12 11.2361L8.92272 13.4721L10.0984 9.8541L7.02114 7.61803H10.8244L12 4Z" fill="#FFFF00"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-12 left-12 w-4 h-4 bg-purple-400 rounded-full animate-pulse" />
                    <div className="absolute bottom-24 right-16 w-6 h-6 bg-red-400 rounded-full opacity-30 animate-bounce" />
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter">Lá Chắn Số</span>
          </div>
          <p className="text-gray-500 text-sm">
            Copyright © 2026 Lá Chắn Số. Bảo lưu mọi quyền.
          </p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .mask-gradient {
          mask-image: linear-gradient(to top, black 20%, transparent 100%);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}} />
    </div>
  );
}
