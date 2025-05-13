import React from 'react';
import styles from './TitleBar.module.css';

const TitleBar: React.FC = () => {
  return (
    <header className={styles.titleBarContainer}>
      <h1 className={styles.title}>AI-MATH</h1>
    </header>
  );
};

export default TitleBar; 