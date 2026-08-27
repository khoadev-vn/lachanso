import { Calendar, Clock, Tag, ArrowRight } from "lucide-react";
import type { BlogArticle } from "../../data/blog/articles";

interface BlogCardProps {
  article: BlogArticle;
  onClick: (slug: string) => void;
}

export default function BlogCard({ article, onClick }: BlogCardProps) {
  return (
    <div 
      className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-[#ff8904]/20 hover:shadow-lg hover:shadow-[#ff8904]/5"
      onClick={() => onClick(article.slug)}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-[#ff8904]/10 px-3 py-1 font-semibold text-[#ff8904]">
          {article.category}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {article.readTime} phút đọc
        </span>
        {article.pinned && (
          <span className="rounded-full bg-gray-900 px-3 py-1 font-semibold text-white">
            Ghim
          </span>
        )}
      </div>
      
      <h3 className="mt-4 text-xl font-bold text-gray-900 group-hover:text-[#ff8904] transition-colors">
        {article.title}
      </h3>
      
      <p className="mt-3 text-sm text-gray-600 line-clamp-2">
        {article.description}
      </p>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          {new Date(article.publishedAt).toLocaleDateString("vi-VN")}
        </div>
        
        <span className="flex items-center gap-1 text-sm font-semibold text-[#ff8904] group-hover:gap-2 transition-all">
          Đọc thêm
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      
      {article.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-600"
            >
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
