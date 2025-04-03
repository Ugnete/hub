import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Tag, X, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type Category = {
  id: string;
  name: string;
  color: string;
};

type CategoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Category) => void;
  onRemoveCategory: (categoryId: string) => void;
  categories: Category[];
  projectId: string;
};

const COLORS = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
];

export default function CategoryDialog({ 
  isOpen, 
  onClose, 
  onAddCategory, 
  onRemoveCategory,
  categories,
  projectId 
}: CategoryDialogProps) {
  const [newCategory, setNewCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const category = {
      id: uuidv4(),
      name: newCategory.trim(),
      color: selectedColor,
    };
    
    onAddCategory(category);
    setNewCategory('');
    setSelectedColor(COLORS[0].value);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Manage Categories
                  </span>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-700/50"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <div className="absolute top-full right-0 mt-2 p-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700/50 grid grid-cols-4 gap-1 w-32">
                        {COLORS.map((color) => (
                          <div
                            key={color.value}
                            className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                              selectedColor === color.value ? 'ring-2 ring-white' : ''
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setSelectedColor(color.value)}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 group"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-white">{category.name}</span>
                        </div>
                        <button
                          onClick={() => onRemoveCategory(category.id)}
                          className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}