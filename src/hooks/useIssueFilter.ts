import { useState, useMemo } from 'react';
import type { Issue } from '../types';

export function useIssueFilter() {
    const [keyword, setKeyword] = useState('');
    const [typeId, setTypeId] = useState('');
    const [statusId, setStatusId] = useState('');
    const [priority, setPriority] = useState('');

    const filterIssues = useMemo(() => {
        return (issues: Issue[]) => {
            return issues.filter((issue) => {
                // Keyword match (Title, Key, Description)
                if (keyword.trim()) {
                    const lower = keyword.toLowerCase();
                    const matchTitle = issue.title.toLowerCase().includes(lower);
                    const matchKey = issue.key.toLowerCase().includes(lower);
                    const matchDesc = issue.description.toLowerCase().includes(lower);
                    if (!matchTitle && !matchKey && !matchDesc) return false;
                }

                // Type match
                if (typeId && issue.typeId !== typeId) return false;

                // Status match
                if (statusId && issue.statusId !== statusId) return false;

                // Priority match
                if (priority && issue.priority !== priority) return false;

                return true;
            });
        };
    }, [keyword, typeId, statusId, priority]);

    return {
        keyword,
        setKeyword,
        typeId,
        setTypeId,
        statusId,
        setStatusId,
        priority,
        setPriority,
        filterIssues,
    };
}
