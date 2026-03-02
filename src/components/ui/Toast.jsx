import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './../../styles/toast.css';

const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />
};

const Toast = ({ message, type = 'info', isRemoving }) => {
    return (
        <div className={`toast toast-${type} ${isRemoving ? 'removing' : ''}`}>
            <div className="toast-icon">
                {icons[type]}
            </div>
            <div className="toast-content">
                <div className="toast-message">{message}</div>
            </div>
        </div>
    );
};

export default Toast;
