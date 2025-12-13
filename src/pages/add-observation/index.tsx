import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ImageCapture from './components/ImageCapture';
import TemperatureInput from './components/TemperatureInput';
import BehaviorToggle from './components/BehaviorToggle';
import NotesTextarea from './components/NotesTextarea';
import HorseSelector from './components/HorseSelector';
import { ObservationFormData, ValidationErrors, Horse } from './types';

const AddObservation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedHorseId = location.state?.horseId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const mockHorses: Horse[] = [
  {
    id: '1',
    name: 'Thunder',
    image: "https://images.unsplash.com/photo-1715329631377-fda852e48bf7",
    alt: 'Majestic brown horse with white blaze standing in green pasture'
  },
  {
    id: '2',
    name: 'Midnight',
    image: "https://images.unsplash.com/photo-1590574746148-05224c8e7930",
    alt: 'Black horse with flowing mane running in open field'
  },
  {
    id: '3',
    name: 'Starlight',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_16cdfaa7d-1765393004972.png",
    alt: 'White horse with gentle expression in stable environment'
  }];


  const [formData, setFormData] = useState<ObservationFormData>({
    horseId: preselectedHorseId || mockHorses[0].id,
    horseName: mockHorses.find((h) => h.id === (preselectedHorseId || mockHorses[0].id))?.name || '',
    image: null,
    imagePreview: '',
    temperature: '',
    behavior: 'normal',
    notes: '',
    timestamp: new Date()
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (preselectedHorseId) {
      const horse = mockHorses.find((h) => h.id === preselectedHorseId);
      if (horse) {
        setFormData((prev) => ({
          ...prev,
          horseId: horse.id,
          horseName: horse.name
        }));
      }
    }
  }, [preselectedHorseId]);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: reader.result as string,
        timestamp: new Date()
      }));
      setErrors((prev) => ({ ...prev, image: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleHorseSelect = (horseId: string) => {
    const horse = mockHorses.find((h) => h.id === horseId);
    if (horse) {
      setFormData((prev) => ({
        ...prev,
        horseId: horse.id,
        horseName: horse.name
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.image) {
      newErrors.image = 'Photo is required';
    }

    if (!formData.temperature) {
      newErrors.temperature = 'Temperature is required';
    } else {
      const temp = parseFloat(formData.temperature);
      if (isNaN(temp) || temp < 35 || temp > 42) {
        newErrors.temperature = 'Temperature must be between 35.0°C and 42.0°C';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setShowSuccess(true);

    // Show success message and redirect
    setTimeout(() => {
      navigate('/horse-timeline', {
        state: {
          horseId: formData.horseId,
          successMessage: 'Observation added successfully'
        }
      });
    }, 1500);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-secondary hover:text-text-primary transition-smooth mb-4">

              <Icon name="ArrowLeft" size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <h1 className="text-3xl font-semibold text-text-primary">
              Add Observation
            </h1>
            <p className="text-secondary mt-2">
              Capture and record horse health monitoring data
            </p>
          </div>

          {/* Success Message */}
          {showSuccess &&
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
              <Icon name="CheckCircle2" size={20} className="text-success" />
              <p className="text-sm font-medium text-success">
                Observation added successfully! Redirecting...
              </p>
            </div>
          }

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Horse Selection */}
            <HorseSelector
              horses={mockHorses}
              selectedHorseId={formData.horseId}
              onHorseSelect={handleHorseSelect} />


            {/* Image Capture */}
            <ImageCapture
              imagePreview={formData.imagePreview}
              onImageSelect={handleImageSelect}
              error={errors.image} />


            {/* Timestamp Display */}
            {formData.imagePreview &&
            <div className="flex items-center gap-2 text-sm text-secondary">
                <Icon name="Clock" size={16} />
                <span>
                  Captured: {formData.timestamp.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                </span>
              </div>
            }

            {/* Temperature Input */}
            <TemperatureInput
              value={formData.temperature}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, temperature: value }));
                setErrors((prev) => ({ ...prev, temperature: undefined }));
              }}
              error={errors.temperature} />


            {/* Behavior Toggle */}
            <BehaviorToggle
              value={formData.behavior}
              onChange={(value) => setFormData((prev) => ({ ...prev, behavior: value }))} />


            {/* Notes Textarea */}
            <NotesTextarea
              value={formData.notes}
              onChange={(value) => setFormData((prev) => ({ ...prev, notes: value }))}
              error={errors.notes} />


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="sm:flex-1">

                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="default"
                loading={isSubmitting}
                disabled={isSubmitting}
                iconName="Check"
                iconPosition="left"
                className="sm:flex-1">

                {isSubmitting ? 'Submitting...' : 'Submit Observation'}
              </Button>
            </div>
          </form>

          {/* Helper Text */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="Info" size={20} className="text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary mb-1">
                  Quick Tips
                </p>
                <ul className="text-xs text-secondary space-y-1">
                  <li>• Ensure good lighting for clear photos</li>
                  <li>• Normal temperature range: 37.5°C - 38.5°C</li>
                  <li>• Mark as suspicious if behavior seems unusual</li>
                  <li>• Add detailed notes for veterinary reference</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileNavigation />
    </div>);

};

export default AddObservation;