import { ArrowLeft, Calendar, Clock, User, Tag, Share2, Facebook, Mail } from "lucide-react";
import type { BlogArticle } from "../../data/blog/articles";

interface BlogArticleViewProps {
  article: BlogArticle;
  onBack: () => void;
}

export default function BlogArticleView({ article, onBack }: BlogArticleViewProps) {
  const shareUrl = `https://lachansovn.vercel.app/blog/${article.slug}`;
  const shareText = `${article.title} - ${article.description}`;

  const renderContent = (content: string) => {
    const lines = content.split("\n").filter(line => line.trim());
    const elements: JSX.Element[] = [];
    let currentSection: JSX.Element[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-4 space-y-2 pl-6">
            {listItems.map((item, i) => (
              <li key={i} className="text-gray-700 leading-relaxed list-disc">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.replace(/^[-*]\s/, ""));
      } else if (/^\d+\.\s/.test(trimmed)) {
        listItems.push(trimmed.replace(/^\d+\.\s/, ""));
      } else {
        flushList();
        elements.push(
          <p key={index} className="text-gray-700 leading-relaxed mb-4">
            {trimmed}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <article className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#ff8904] transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          Quay lại danh sách bài viết
        </button>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            <span className="rounded-full bg-[#ff8904]/10 px-4 py-1.5 font-semibold text-[#ff8904]">
              {article.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.readTime} phút đọc
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(article.publishedAt).toLocaleDateString("vi-VN")}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          <p className="text-lg text-gray-600 mb-4">
            {article.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {article.author}
            </span>
          </div>
        </header>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="prose prose-lg max-w-none">
            {renderContent(article.content)}
          </div>
        </div>

        {article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span 
                key={tag} 
                className="flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1.5 text-sm text-gray-700"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Chia sẻ bài viết</h3>
          <div className="flex gap-3">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#1877f2] px-4 py-2 text-white hover:bg-[#166fe5] transition-colors"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`}
              className="flex items-center gap-2 rounded-full bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                alert("Đã sao chép link!");
              }}
              className="flex items-center gap-2 rounded-full bg-[#ff8904] px-4 py-2 text-white hover:bg-[#e67a00] transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Sao chép link
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
