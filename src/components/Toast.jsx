export default function Toast({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'ℹ'}
                        {toast.type === 'warning' && '⚠'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
