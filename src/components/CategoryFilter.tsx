import React from 'react';
import { Tag } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
};

type CategoryFilterProps = {
  categories: Category[];
  selectedCategories: string[];
  onSelectCategory: (categoryId: string) => void;
};

export default function CategoryFilter({ 
  categories, 
  selectedCategories, 
  onSelectCategory 
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
            ${selectedCategories.includes(category.id) 
              ? 'ring-2 ring-offset-2 ring-offset-gray-900'
              : 'opacity-70 hover:opacity-100'
            }`}
          style={{
            backgroundColor: `${category.color}20`,
            color: category.color,
            border: `1px solid ${category.color}40`,
            ringColor: category.color
          }}
        >
          <Tag className="w-4 h-4" />
          {category.name}
        </button>
      ))}
    </div>
  );
}