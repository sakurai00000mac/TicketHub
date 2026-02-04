import { FiSearch, FiFilter } from 'react-icons/fi';
import type { Project } from '../../types';

interface IssueFilterProps {
    project: Project;
    keyword: string;
    setKeyword: (val: string) => void;
    typeId: string;
    setTypeId: (val: string) => void;
    statusId: string;
    setStatusId: (val: string) => void;
    priority: string;
    setPriority: (val: string) => void;
}

export function IssueFilter({
    project,
    keyword,
    setKeyword,
    typeId,
    setTypeId,
    statusId,
    setStatusId,
    priority,
    setPriority,
}: IssueFilterProps) {
    return (
        <div className='issue-filter-bar' style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            padding: '12px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '6px',
            alignItems: 'center'
        }}>
            <div style={{ position: 'relative', minWidth: '200px', flex: 1 }}>
                <FiSearch style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="キーワード検索 (件名, キー, 詳細)"
                    style={{
                        width: '100%',
                        padding: '6px 8px 6px 30px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px'
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <FiFilter style={{ color: 'var(--color-text-secondary)' }} />

                <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                >
                    <option value="">全ての種別</option>
                    {project.issueTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <select
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                >
                    <option value="">全てのステータス</option>
                    {project.issueStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                >
                    <option value="">全ての優先度</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                </select>
            </div>
        </div>
    );
}
