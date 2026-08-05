import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { BLOG_ARTICLES, getBlogCategories } from "../../data/blog/articles";
import BlogCard from "./BlogCard";

interface BlogListProps {
  onArticleClick: (slug: string) => void;
}

export default function BlogList({ onArticleClick }: BlogListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = getBlogCategories();
  
  const filteredArticles = BLOG_ARTICLES.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      !selectedCategory || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Blog An Ninh Mạng
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Kiến thức phòng chống lừa đảo, bảo vệ bản thân và gia đình trên không gian mạng
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 focus:border-[#ff8904] focus:ring-2 focus:ring-[#ff8904]/20 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#ff8904] focus:ring-2 focus:ring-[#ff8904]/20 outline-none transition-all"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 text-sm text-gray-500">
          Hiển thị {filteredArticles.length} / {BLOG_ARTICLES.length} bài viết
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Không tìm thấy bài viết phù hợp</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map(article => (
              <BlogCard 
                key={article.id} 
                article={article}
                onClick={onArticleClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
