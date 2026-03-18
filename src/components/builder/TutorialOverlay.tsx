import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, LayoutGrid as Layout, FileText, ShoppingCart } from 'lucide-react';
import { BuilderComponent } from '../../types/builder';
import { generateId } from '../../lib/builderHelpers';

interface TutorialStep {
  title: string;
  description: string;
  target?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to the Website Builder',
    description: 'Create beautiful websites with our drag-and-drop interface. Let us show you how it works!',
  },
  {
    title: 'Component Library',
    description: 'Browse components in the left panel. Click on a component to add it to your page, or drag it for precise placement.',
    target: 'component-library',
  },
  {
    title: 'Drag and Drop',
    description: 'Drag components from the library onto the canvas. Drop zones will highlight to show where you can place them.',
    target: 'canvas',
  },
  {
    title: 'Properties Panel',
    description: 'Select any component to edit its properties, styling, and content in the right panel.',
    target: 'properties-panel',
  },
  {
    title: 'Quick Start Templates',
    description: 'Choose a template to get started quickly, or start from scratch and build your own design.',
  },
];

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  components: BuilderComponent[];
}

const templates: Template[] = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero section with CTA buttons',
    icon: Sparkles,
    components: [
      {
        id: generateId(),
        type: 'Section',
        props: {
          backgroundColor: '#3b82f6',
          padding: '80px 20px',
        },
        children: [
          {
            id: generateId(),
            type: 'Heading',
            props: {
              text: 'Welcome to Our Product',
              level: 1,
              color: '#ffffff',
              align: 'center',
            },
            children: [],
          },
          {
            id: generateId(),
            type: 'Text',
            props: {
              text: 'Build amazing websites with our drag-and-drop builder',
              color: '#e0e7ff',
              align: 'center',
              fontSize: '18px',
            },
            children: [],
          },
          {
            id: generateId(),
            type: 'Button',
            props: {
              text: 'Get Started',
              variant: 'solid',
              backgroundColor: '#ffffff',
              textColor: '#3b82f6',
            },
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'blog',
    name: 'Blog Layout',
    description: 'Header and content sections',
    icon: FileText,
    components: [
      {
        id: generateId(),
        type: 'Navbar',
        props: {
          backgroundColor: '#1f2937',
          height: '64px',
        },
        children: [],
      },
      {
        id: generateId(),
        type: 'Section',
        props: {
          backgroundColor: '#ffffff',
          padding: '40px 20px',
        },
        children: [
          {
            id: generateId(),
            type: 'Heading',
            props: {
              text: 'My Blog',
              level: 1,
              color: '#1f2937',
            },
            children: [],
          },
          {
            id: generateId(),
            type: 'Text',
            props: {
              text: 'Welcome to my blog. Share your thoughts and stories with the world.',
              color: '#6b7280',
            },
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Showcase your work',
    icon: Layout,
    components: [
      {
        id: generateId(),
        type: 'Section',
        props: {
          backgroundColor: '#f9fafb',
          padding: '60px 20px',
        },
        children: [
          {
            id: generateId(),
            type: 'Heading',
            props: {
              text: 'My Portfolio',
              level: 1,
              color: '#111827',
              align: 'center',
            },
            children: [],
          },
          {
            id: generateId(),
            type: 'Container',
            props: {
              display: 'grid',
              gap: '20px',
            },
            children: [],
          },
        ],
      },
    ],
  },
];

interface TutorialOverlayProps {
  onComplete: (template?: BuilderComponent[]) => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('builder_tutorial_completed');
    if (hasSeenTutorial) {
      setVisible(false);
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('builder_tutorial_completed', 'true');
    setVisible(false);

    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        onComplete(template.components);
        return;
      }
    }

    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!visible) return null;

  const step = tutorialSteps[currentStep];
  const isTemplateStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn" />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 pointer-events-auto animate-slideUp">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentStep
                          ? 'w-8 bg-blue-600'
                          : index < currentStep
                          ? 'w-1.5 bg-blue-400'
                          : 'w-1.5 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {currentStep + 1} of {tutorialSteps.length}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {step.description}
          </p>

          {isTemplateStep && (
            <div className="mb-8 space-y-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedTemplate === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Start from Scratch</div>
                    <div className="text-sm text-gray-500">Build your own design</div>
                  </div>
                </div>
              </button>

              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <template.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Skip Tutorial
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Get Started'}
                {currentStep < tutorialSteps.length - 1 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
