import React, { useState, useRef } from 'react';
import { Eatery, TAG_IDEAS, ratingText, ratingNumericLabel } from '../types';
import { useStore } from '../services/storeContext';
import { BitePillLabel, SelectedReviewImages } from './BiteUiComponents';
import { compressImageFile } from '../services/imageUtils';

interface ReviewDialogProps {
  place: Eatery;
  onClose: () => void;
}

export const ReviewDialog: React.FC<ReviewDialogProps> = ({ place, onClose }) => {
  const { addReview } = useStore();
  
  const [hasRating, setHasRating] = useState<boolean>(true);
  const [rating, setRating] = useState<number>(8); // 8 = 4.0 / 5
  const [review, setReview] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [liked, setLiked] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidDate = !isNaN(Date.parse(date));

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError('');

    const newPhotos: string[] = [];
    const countToTake = Math.min(files.length, 5);
    if (files.length > 5) {
      setUploadError('Only the first five photos were selected.');
    }

    for (let i = 0; i < countToTake; i++) {
      try {
        const b64 = await compressImageFile(files[i], 640);
        newPhotos.push(b64);
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedPhotos(newPhotos);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDate || saving || review.length > 3000) return;
    if (!hasRating && !review.trim() && selectedPhotos.length === 0) return;

    setSaving(true);
    setUploadError('');
    try {
      await addReview({
        eateryId: place.id,
        rating: hasRating ? rating : 0,
        review: review.trim(),
        visitDate: date,
        tags: selectedTags,
        liked,
        photoBase64s: selectedPhotos
      });
      onClose();
    } catch (err: any) {
      setUploadError(err?.message || 'Could not save review or upload photos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={() => { if (!saving) onClose(); }}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#DDE5DE]"
        onClick={e => e.stopPropagation()}
      >
        {/* Title */}
        <div className="p-5 pb-3">
          <h3 className="font-serif font-bold text-xl text-[#233B3B]">
            Log {place.name}
          </h3>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 space-y-4">
          {/* Add a Tasteboxd rating Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#233B3B] font-medium">
              <input 
                type="checkbox"
                checked={hasRating}
                onChange={e => setHasRating(e.target.checked)}
                className="w-4 h-4 rounded text-[#926017] focus:ring-[#926017]"
              />
              <span>Add a Tasteboxd rating</span>
            </label>

            {hasRating && (
              <div className="mt-2.5 bg-[#FAF8F1] p-3 rounded-xl border border-[#DDE5DE]/70">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#926017] font-bold text-sm">
                    {ratingText(rating)}  {ratingNumericLabel(rating)} / 5
                  </span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={rating}
                  onChange={e => setRating(parseInt(e.target.value, 10))}
                  className="w-full accent-[#926017] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#627370] mt-1">
                  <span>0.5</span>
                  <span>2.5</span>
                  <span>5.0</span>
                </div>
              </div>
            )}
          </div>

          {/* Visit Date */}
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1">
              Visit date (YYYY-MM-DD)
            </label>
            <input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className={`w-full text-sm p-2.5 rounded-xl border ${
                isValidDate ? 'border-[#DDE5DE]' : 'border-red-500'
              } focus:ring-1 focus:ring-[#235D5B] focus:outline-none bg-white`}
            />
          </div>

          {/* Your Review */}
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1">
              Your review (optional)
            </label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value.slice(0, 3000))}
              rows={3}
              placeholder="What did you order? How was the food, service and vibe?"
              className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none bg-white resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <input 
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="text-xs font-bold text-[#926017] hover:underline"
              >
                {selectedPhotos.length === 0 ? "Add review photos (up to 5)" : "Change selected photos"}
              </button>
              {selectedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotos([])}
                  disabled={saving}
                  className="text-xs text-[#627370] hover:text-red-600"
                >
                  Remove photos
                </button>
              )}
            </div>

            <SelectedReviewImages photos={selectedPhotos} />

            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}
          </div>

          {/* Loved it ♥ Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#233B3B] font-semibold">
              <input 
                type="checkbox"
                checked={liked}
                onChange={e => setLiked(e.target.checked)}
                className="w-4 h-4 rounded text-[#926017] focus:ring-[#926017]"
              />
              <span>Loved it ♥</span>
            </label>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-[#233B3B] mb-1.5">Add tags</p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {TAG_IDEAS.map(tag => (
                <BitePillLabel
                  key={tag}
                  text={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={() => handleTagToggle(tag)}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 pb-4 border-t border-[#DDE5DE]">
            <button 
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-[#627370] hover:text-[#233B3B]"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!isValidDate || saving || review.length > 3000 || (!hasRating && !review.trim() && selectedPhotos.length === 0)}
              className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-sm px-6 py-2 rounded-full transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Share review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
