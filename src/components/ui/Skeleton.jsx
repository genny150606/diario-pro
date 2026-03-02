import React from 'react';
import './../../styles/skeleton.css';

const Skeleton = ({ className = '', style = {}, variant = '' }) => {
    const classes = `skeleton ${variant ? `skeleton-${variant}` : ''} ${className}`;
    return <div className={classes} style={style} />;
};

export default Skeleton;
