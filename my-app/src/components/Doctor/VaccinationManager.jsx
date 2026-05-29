import React, { useState, useEffect } from 'react';
import { Syringe, NotebookPen, CheckCircle2, Clock, History, Plus, ShieldCheck, List } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_BAS = import.meta.env.VITE_API_URL;

const VaccinationManager = () => {
    const { slug } = useParams();

    const [vaccineName, setVaccineName] = useState('');
    const [note, setNote] = useState('');
    const [action, setAction] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [slug]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BAS}/api/vaccination/${slug}/history`);
            if (res.data.success) setHistory(res.data.data);
        } catch (err) {
            console.error('History fetch error', err);
        }
    };

    const handleSave = async () => {
        if (!vaccineName) return;
        setLoading(true);
        try {
            const res = await axios.post(`${API_BAS}/api/vaccination/${slug}/add`, {
                vaccineName,
                note,
                action,
            });
            if (res.data.success) {
                setVaccineName('');
                setNote('');
                setAction('');
                fetchHistory();
            }
        } catch (err) {
            console.error('Save error', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isAdministered = (record) => record.action === 'Administered';

    return (
        <div style={styles.root}>

            {/* Left: Entry Form */}
            <div style={styles.panel}>
                <div style={styles.panelHeader}>
                    <Syringe size={15} style={{ color: 'var(--text-secondary)' }} />
                    <span style={styles.panelTitle}>Record immunization</span>
                </div>
                <div style={styles.panelBody}>

                    <div style={styles.field}>
                        <label style={styles.label}>Vaccine name</label>
                        <input
                            type="text"
                            value={vaccineName}
                            onChange={(e) => setVaccineName(e.target.value)}
                            placeholder="e.g. Covaxin, BCG, MMR"
                            style={styles.input}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Observation note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Dosage, site, patient response…"
                            rows={3}
                            style={styles.textarea}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Action taken</label>
                        <textarea
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            placeholder="Steps taken or follow-up required…"
                            rows={3}
                            style={styles.textarea}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading || !vaccineName}
                        style={{
                            ...styles.btnPrimary,
                            opacity: loading || !vaccineName ? 0.45 : 1,
                            cursor: loading || !vaccineName ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Plus size={15} />
                        {loading ? 'Saving…' : 'Save record'}
                    </button>

                </div>
            </div>

            {/* Right: History */}
            <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column' }}>
                <div style={styles.panelHeader}>
                    <List size={15} style={{ color: 'var(--text-secondary)' }} />
                    <span style={styles.panelTitle}>Immunization history</span>
                    {history.length > 0 && (
                        <span style={styles.countBadge}>{history.length} records</span>
                    )}
                </div>

                <div style={styles.historyList}>
                    {history.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Syringe size={28} style={{ color: '#cbd5e1', marginBottom: 10 }} />
                            <p style={styles.emptyText}>No records found</p>
                        </div>
                    ) : (
                        history.map((record, idx) => (
                            <div
                                key={idx}
                                style={styles.recordRow}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{
                                    ...styles.recordIcon,
                                    backgroundColor: isAdministered(record) ? '#f0fdf4' : '#fffbeb',
                                }}>
                                    {isAdministered(record)
                                        ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                                        : <Clock size={16} style={{ color: '#d97706' }} />
                                    }
                                </div>

                                <div style={styles.recordMain}>
                                    <div style={styles.recordName}>{record.vaccineName}</div>
                                    <div style={styles.recordNote}>{record.note || 'No notes added'}</div>
                                </div>

                                <div style={styles.recordMeta}>
                                    <div style={styles.recordDate}>{formatDate(record.date)}</div>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: isAdministered(record) ? '#f0fdf4' : '#fffbeb',
                                        color: isAdministered(record) ? '#16a34a' : '#d97706',
                                    }}>
                                        {isAdministered(record)
                                            ? <CheckCircle2 size={10} />
                                            : <Clock size={10} />
                                        }
                                        {record.action || '—'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

const styles = {
    root: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 16,
        padding: '4px 0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    panel: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
    },
    panelTitle: {
        fontSize: 13,
        fontWeight: 500,
        color: '#0f172a',
    },
    countBadge: {
        marginLeft: 'auto',
        fontSize: 12,
        color: '#94a3b8',
    },
    panelBody: {
        padding: 16,
    },
    field: {
        marginBottom: 14,
    },
    label: {
        display: 'block',
        fontSize: 12,
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        width: '100%',
        fontSize: 13,
        padding: '8px 10px',
        border: '1px solid #e2e8f0',
        borderRadius: 7,
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        fontSize: 13,
        padding: '8px 10px',
        border: '1px solid #e2e8f0',
        borderRadius: 7,
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        outline: 'none',
        resize: 'none',
        lineHeight: 1.5,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
    },
    btnPrimary: {
        width: '100%',
        padding: '9px 16px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        border: 'none',
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'opacity 0.15s',
        marginTop: 4,
    },
    historyList: {
        overflowY: 'auto',
        maxHeight: 460,
    },
    recordRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.1s',
    },
    recordIcon: {
        width: 32,
        height: 32,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    recordMain: {
        flex: 1,
        minWidth: 0,
    },
    recordName: {
        fontSize: 13,
        fontWeight: 500,
        color: '#0f172a',
    },
    recordNote: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    recordMeta: {
        textAlign: 'right',
        flexShrink: 0,
    },
    recordDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        marginTop: 4,
    },
    emptyState: {
        padding: '48px 16px',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: '#94a3b8',
    },
};

export default VaccinationManager;