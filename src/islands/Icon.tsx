// Preact-версия <Icon> для островов (wizard'ы). Та же разметка и стили, что у Icon.astro.
import { renderIcon, type IconName } from '../lib/icons';

interface Props {
  name: IconName;
  label?: string;
  decorative?: boolean;
  size?: string;
  class?: string;
}

export function Icon({ name, label, decorative, size = '1.5em', class: className }: Props) {
  return (
    <span
      class={className === undefined ? 'icon' : `icon ${className}`}
      style={{ '--icon-size': size }}
      dangerouslySetInnerHTML={{ __html: renderIcon(name, { label, decorative }) }}
    />
  );
}
