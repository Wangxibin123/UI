import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import styles from './ContextMenu.module.css';
import MenuItem, { type MenuItemProps } from '../MenuItem/MenuItem'; // Assuming MenuItem is in a sibling folder
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';

export interface ContextMenuHandle {
  open: (x: number, y: number, items: MenuItemProps[], targetNodeId?: string) => void;
  close: () => void;
  isOpen: () => boolean;
}

interface MenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  items: MenuItemProps[];
  currentTargetNodeId?: string;
  // State for one level of submenu
  activeSubMenuParentId: string | null; 
  subMenuItems: MenuItemProps[];
  subMenuPosition: { x: number; y: number } | null;
  // We might need a ref for the active parent item to position the submenu
  activeParentItemRef: React.RefObject<HTMLLIElement> | null; 
}

const ContextMenu: React.ForwardRefRenderFunction<ContextMenuHandle> = (_props, ref) => {
  const [menuState, setMenuState] = useState<MenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    items: [],
    currentTargetNodeId: undefined,
    activeSubMenuParentId: null,
    subMenuItems: [],
    subMenuPosition: null,
    activeParentItemRef: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null); // Ref for the submenu container
  const portalElementRef = useRef<HTMLDivElement | null>(null); // Ref to store the portal DOM element
  const itemRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());

  // Create and append the portal element on mount, remove on unmount
  useEffect(() => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    portalElementRef.current = element;

    return () => {
      if (portalElementRef.current) {
        document.body.removeChild(portalElementRef.current);
        portalElementRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const adjustMenuPosition = useCallback((x: number, y: number, menuElement: HTMLDivElement | null, itemsForHeightEstimation: MenuItemProps[]): { x: number; y: number } => {
    if (!menuElement) return { x, y };

    const menuWidth = menuElement.offsetWidth || 200; 
    const estimatedItemHeight = 35; 
    const separatorHeight = 8; 
    let menuHeight = 12; 
    itemsForHeightEstimation.forEach(item => {
      menuHeight += item.type === 'separator' ? separatorHeight : estimatedItemHeight;
    });
    menuHeight = Math.max(menuHeight, menuElement.offsetHeight); 

    const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > viewportWidth) adjustedX = viewportWidth - menuWidth - 5;
    if (y + menuHeight > viewportHeight) adjustedY = viewportHeight - menuHeight - 5;
    if (adjustedX < 0) adjustedX = 5;
    if (adjustedY < 0) adjustedY = 5;
    
    return { x: adjustedX, y: adjustedY };
  }, []);

  // Modified openMenu to reset submenu state
  const openMenu = useCallback((x: number, y: number, items: MenuItemProps[], targetNodeId?: string) => {
    itemRefs.current.clear(); // Clear refs from previous menu instance
    setMenuState(prevState => ({
      ...prevState,
      isVisible: true,
      position: { x, y }, 
      items,
      currentTargetNodeId: targetNodeId,
      activeSubMenuParentId: null, 
      subMenuItems: [],
      subMenuPosition: null,
    }));
  }, []);
  
  // Effect to adjust position after menu is visible and rendered (to get its dimensions)
  useEffect(() => {
    if (menuState.isVisible && menuRef.current && !menuState.activeSubMenuParentId) { // Adjust main menu only if no submenu is trying to open
      const adjustedPos = adjustMenuPosition(menuState.position.x, menuState.position.y, menuRef.current, menuState.items);
      if (adjustedPos.x !== menuState.position.x || adjustedPos.y !== menuState.position.y) {
        setMenuState(prevState => ({ ...prevState, position: adjustedPos }));
      }
    }
  }, [menuState.isVisible, menuState.position.x, menuState.position.y, menuState.items, adjustMenuPosition, menuState.activeSubMenuParentId]);

  // Modified closeMenu to reset submenu state
  const closeMenu = useCallback(() => {
    setMenuState(prevState => ({
      ...prevState,
      isVisible: false,
      items: [],
      activeSubMenuParentId: null, 
      subMenuItems: [],
      subMenuPosition: null,
    }));
  }, []);

  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
    isOpen: () => menuState.isVisible,
  }));

  const registerItemRef = (id: string, element: HTMLLIElement | null) => {
    if (element) {
        itemRefs.current.set(id, element);
    } else {
        itemRefs.current.delete(id);
    }
  };

  const handleItemClick = useCallback((clickedItem: MenuItemProps, event: React.MouseEvent) => {
    event.stopPropagation(); // Stop propagation to prevent immediate main menu close if submenu opens

    if (clickedItem.subMenu && clickedItem.subMenu.length > 0) {
      if (clickedItem.id === menuState.activeSubMenuParentId) { // Clicked on the parent of an already open submenu
        setMenuState(prev => ({ ...prev, activeSubMenuParentId: null, subMenuItems: [], subMenuPosition: null }));
      } else { // Open a new submenu or switch to a different one
        const parentLiElement = itemRefs.current.get(clickedItem.id);
        if (parentLiElement) {
          const parentRect = parentLiElement.getBoundingClientRect();
          let subMenuX = parentRect.right;
          let subMenuY = parentRect.top;
          
          // Basic boundary check for submenu (simplified)
          // A more robust solution would use adjustMenuPosition for the submenu itself after it renders to get dimensions
          const tempSubMenuWidth = 200; // Estimate
          const { innerWidth: viewportWidth } = window;
          if (subMenuX + tempSubMenuWidth > viewportWidth) {
            subMenuX = parentRect.left - tempSubMenuWidth; // Try opening to the left
            if (subMenuX < 0) subMenuX = 5; // Fallback if still off-screen
          }

          setMenuState(prev => ({
            ...prev,
            activeSubMenuParentId: clickedItem.id,
            subMenuItems: clickedItem.subMenu || [],
            subMenuPosition: { x: subMenuX, y: subMenuY },
          }));
        } else {
          console.error(`[ContextMenu] Parent <li> element not found for item ID: ${clickedItem.id}`);
          setMenuState(prev => ({ ...prev, activeSubMenuParentId: null, subMenuItems: [], subMenuPosition: null }));
        }
      }
    } else { // Item without a submenu is clicked
      clickedItem.onClick?.(event as React.MouseEvent<HTMLButtonElement>, menuState.currentTargetNodeId);
      closeMenu();
    }
  }, [menuState.activeSubMenuParentId, menuState.currentTargetNodeId, closeMenu, itemRefs]);
  
  // Adjust submenu position after it has rendered and subMenuRef.current is available
  useEffect(() => {
    if (menuState.activeSubMenuParentId && subMenuRef.current && menuState.subMenuPosition) {
        const adjustedSubMenuPos = adjustMenuPosition(
            menuState.subMenuPosition.x, 
            menuState.subMenuPosition.y, 
            subMenuRef.current, 
            menuState.subMenuItems
        );
        if (adjustedSubMenuPos.x !== menuState.subMenuPosition.x || adjustedSubMenuPos.y !== menuState.subMenuPosition.y) {
            setMenuState(prev => ({ ...prev, subMenuPosition: adjustedSubMenuPos }));
        }
    }
  }, [menuState.activeSubMenuParentId, menuState.subMenuPosition, menuState.subMenuItems, adjustMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          (!subMenuRef.current || !subMenuRef.current.contains(event.target as Node))) {
        closeMenu();
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuState.activeSubMenuParentId) {
          setMenuState(prev => ({ ...prev, activeSubMenuParentId: null, subMenuItems: [], subMenuPosition: null }));
        } else {
          closeMenu();
        }
      }
    };
    if (menuState.isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [menuState.isVisible, menuState.activeSubMenuParentId, closeMenu]);

  // If menu is not visible or portal not ready, render nothing
  if (!menuState.isVisible || !portalElementRef.current) {
    if(menuState.isVisible) console.log("[ContextMenu] Not rendering: portalElementRef.current is null/false.");
    return null;
  }
  console.log("[ContextMenu] Rendering with state:", menuState);
  
  return createPortal(
    <>
      <FocusTrap
        active={menuState.isVisible && !menuState.activeSubMenuParentId} // Trap focus on main menu if no submenu open
        focusTrapOptions={{
          initialFocus: false,
          allowOutsideClick: true,
          escapeDeactivates: false,
        }}
      >
        <div
          ref={menuRef}
          className={`${styles.contextMenuContainer} ${menuState.isVisible ? styles.visible : ''}`}
          style={{ top: menuState.position.y, left: menuState.position.x }}
          role="menu"
          aria-labelledby={menuState.currentTargetNodeId ? `context-menu-for-${menuState.currentTargetNodeId}` : undefined}
        >
          <ul aria-label="Context menu options">
            {menuState.items.map((item) => (
              <MenuItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                disabled={item.disabled}
                type={item.type}
                className={item.className}
                subMenu={item.subMenu} // Pass subMenu prop
                level={0} // Main menu items are level 0
                registerRef={registerItemRef} // Pass ref registration callback
                onClick={(e) => handleItemClick(item, e as React.MouseEvent)} // Use central click handler
              />
            ))}
          </ul>
        </div>
      </FocusTrap>
      {/* Submenu rendering will go here */}
      {menuState.activeSubMenuParentId && menuState.subMenuItems.length > 0 && menuState.subMenuPosition && (
        <FocusTrap 
          active={true} // Trap focus on submenu when open
          focusTrapOptions={{
            initialFocus: false, 
            allowOutsideClick: true, 
            escapeDeactivates: false,
          }}
        >
          <div 
            ref={subMenuRef} 
            className={`${styles.contextMenuContainer} ${styles.visible} ${styles.subMenu}`}
            style={{ top: menuState.subMenuPosition.y, left: menuState.subMenuPosition.x }}
            role="menu"
          >
            <ul aria-label={`Submenu for ${menuState.activeSubMenuParentId}`}>
              {menuState.subMenuItems.map(subItem => (
                <MenuItem 
                  key={subItem.id}
                  {...subItem} // Spread all props from subItem definition
                  level={1} // Submenu items are level 1
                  onClick={(e) => handleItemClick(subItem, e as React.MouseEvent)} // Reuse handleItemClick for submenu items
                />
              ))}
            </ul>
          </div>
        </FocusTrap>
      )}
    </>
  , portalElementRef.current);
};

export default React.forwardRef(ContextMenu); 