import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface EnhancedCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  globalCategories: Category[];
  onAddCategory: (category: Category) => void;
  onRemoveCategory: (categoryId: string) => void;
}

export default function EnhancedCategoryDialog({
  isOpen,
  onClose,
  categories,
  globalCategories,
  onAddCategory,
  onRemoveCategory
}: EnhancedCategoryDialogProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    
    const newCategory = {
      id: uuidv4(),
      name: newCategoryName,
      color: newCategoryColor
    };
    
    onAddCategory(newCategory);
    setNewCategoryName('');
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
                <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                  Manage Categories
                </Dialog.Title>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Assigned Categories</h4>
                    {categories.length > 0 ? (
                      <div className="space-y-2">
                        {categories.map(category => (
                          <div 
                            key={category.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ 
                              backgroundColor: `${category.color}10`,
                              border: `1px solid ${category.color}30`
                            }}
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                              />
                              <span>{category.name}</span>
                            </div>
                            <button
                              onClick={() => onRemoveCategory(category.id)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No categories assigned</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Add Category</h4>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="h-9 w-9 rounded bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="search-input flex-1"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="btn-primary"
                        disabled={!newCategoryName}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Available Categories</h4>
                    <div className="max-h-40 overflow-y-auto">
                      {globalCategories
                        .filter(gc => !categories.some(c => c.id === gc.id))
                        .map(category => (
                          <div 
                            key={category.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/30 cursor-pointer"
                            onClick={() => onAddCategory(category)}
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                              />
                              <span>{category.name}</span>
                            </div>
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onClose}
                    >
                      Done
                    </button>
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