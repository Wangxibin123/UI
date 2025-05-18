import React, { forwardRef } from 'react';
import styles from './MenuItem.module.css';
import { ChevronRight } from 'lucide-react';

export interface MenuItemProps {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>, nodeId?: string) => void;
  disabled?: boolean;
  type?: 'item' | 'separator';
  className?: string;
  subMenu?: MenuItemProps[];
  level?: number;
  registerRef?: (id: string, element: HTMLLIElement | null) => void;
}

const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>((
  {
    id,
    label,
    icon,
    onClick,
    disabled = false,
    type = 'item',
    className = '',
    subMenu,
    level = 0,
    registerRef
  },
  ref
) => {
  if (type === 'separator') {
    return <li id={id} className={`${styles.separator} ${className}`.trim()} role="separator" />;
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !onClick) {
      return;
    }
    onClick(event);
  };

  const hasSub = subMenu && subMenu.length > 0;

  const itemStyle: React.CSSProperties = {
    // paddingLeft: level > 0 ? `${level * 15}px` : undefined
  };

  return (
    <li 
      id={id} 
      ref={(element) => {
        if (typeof ref === 'function') {
          ref(element);
        }
        if (registerRef) {
          registerRef(id, element);
        }
      }}
      className={`${styles.menuItemListItem} ${className} ${hasSub ? styles.hasSubmenu : ''}`.trim()} 
      role="none"
      style={itemStyle}
    >
      <button
        className={`${styles.menuItemButton} ${disabled ? styles.disabled : ''}`.trim()}
        onClick={handleClick}
        disabled={disabled}
        role="menuitem"
        aria-haspopup={hasSub ? 'menu' : undefined}
        aria-expanded={false}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {label && <span className={styles.label}>{label}</span>}
        {hasSub && <ChevronRight className={styles.submenuArrow} size={16} />}
      </button>
    </li>
  );
});

MenuItem.displayName = 'MenuItem';

export default MenuItem; 