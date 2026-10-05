export interface Book { id: string; title: string; filename: string; fileType: 'pdf' | 'doc' | 'docx' | 'other'; category: string; subcategory: string; fileUrl: string; coverUrl?: string; sourceModifiedAt?: number; author?: string; description?: string; volume?: number; collection?: string; }
export interface Category { name: string; icon: string; }
