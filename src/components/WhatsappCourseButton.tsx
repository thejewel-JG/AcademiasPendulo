import React from 'react';
import { buildWhatsappUrl, WhatsappConfig } from '../utils/whatsappUtils';

export const WhatsappIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.359 4.984L2 22l5.188-1.359c1.453.797 3.109 1.234 4.844 1.234 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.453 1.344-2.016 1.422-.531.078-1.203.109-1.953-.125-.453-.141-1.047-.344-1.797-.672-3.156-1.359-5.219-4.547-5.375-4.75-.156-.203-1.281-1.703-1.281-3.25s.813-2.313 1.109-2.625c.297-.313.641-.391.859-.391.219 0 .422.016.609.016.203 0 .469-.078.734.563.281.672.953 2.313 1.031 2.484.078.172.141.375.031.578-.109.203-.172.328-.344.516-.172.188-.359.422-.516.563-.172.172-.359.359-.156.703.203.344.906 1.484 1.938 2.406 1.328 1.188 2.453 1.563 2.797 1.734.344.172.547.141.75-.094.203-.234.859-1 .109-1.344.234-.344.484-.281.813-.172.328.109 2.094.984 2.453 1.156.359.172.594.266.688.406.094.141.094.813-.156 1.516z" />
  </svg>
);

interface WhatsappCourseButtonProps {
  id?: string;
  course: { id?: string; title?: string; titulo?: string; slug?: string };
  whatsappConfig: WhatsappConfig;
  onFallbackClick?: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
  iconClassName?: string;
  stopPropagation?: boolean;
}

export const WhatsappCourseButton: React.FC<WhatsappCourseButtonProps> = ({
  id,
  course,
  whatsappConfig,
  onFallbackClick,
  className = '',
  label = 'Solicitar información',
  iconClassName = 'w-4 h-4 shrink-0 text-[#25D366]',
  stopPropagation = true
}) => {
  const url =
    whatsappConfig.configured && whatsappConfig.whatsapp_activo && whatsappConfig.whatsapp_numero
      ? buildWhatsappUrl(whatsappConfig.whatsapp_numero, course, whatsappConfig.whatsapp_plantilla)
      : null;

  if (url) {
    return (
      <a
        id={id}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
        }}
        className={className}
        data-course-id={course.id || ''}
        data-whatsapp-link="true"
      >
        <WhatsappIcon className={iconClassName} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={(e) => {
        if (stopPropagation) {
          e.stopPropagation();
        }
        if (onFallbackClick) {
          onFallbackClick(e);
        }
      }}
      className={className}
      data-course-id={course.id || ''}
      data-whatsapp-link="fallback"
    >
      <WhatsappIcon className={iconClassName} />
      <span>{label}</span>
    </button>
  );
};
