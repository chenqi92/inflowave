import React from 'react';
import { ErrorTooltip } from '@/components/ui/ErrorTooltip';

interface DatabaseExplorerErrorTooltipsProps {
    connectionErrors: Map<string, string>;
    databaseErrors: Map<string, string>;
    nodeRefsMap: React.MutableRefObject<Map<string, HTMLElement>>;
    setConnectionErrors: React.Dispatch<React.SetStateAction<Map<string, string>>>;
    setDatabaseErrors: React.Dispatch<React.SetStateAction<Map<string, string>>>;
}

export const DatabaseExplorerErrorTooltips: React.FC<DatabaseExplorerErrorTooltipsProps> = ({
    connectionErrors,
    databaseErrors,
    nodeRefsMap,
    setConnectionErrors,
    setDatabaseErrors,
}) => {
    return (
        <>
            {/* 连接错误提示 */}
            {Array.from(connectionErrors.entries()).map(([connectionId, errorMessage]) => {
                const nodeKey = `connection-${connectionId}`;
                const nodeElement = nodeRefsMap.current.get(nodeKey);
                if (!nodeElement) return null;

                return (
                    <ErrorTooltip
                        key={nodeKey}
                        targetRef={{ current: nodeElement }}
                        message="连接失败"
                        visible={true}
                        autoHideDuration={3000}
                        onHide={() => {
                            setConnectionErrors(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(connectionId);
                                return newMap;
                            });
                        }}
                    />
                );
            })}

            {/* 数据库错误提示 */}
            {Array.from(databaseErrors.entries()).map(([databaseKey, errorMessage]) => {
                const nodeElement = nodeRefsMap.current.get(databaseKey);
                if (!nodeElement) return null;

                return (
                    <ErrorTooltip
                        key={databaseKey}
                        targetRef={{ current: nodeElement }}
                        message="无法打开"
                        visible={true}
                        autoHideDuration={3000}
                        onHide={() => {
                            setDatabaseErrors(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(databaseKey);
                                return newMap;
                            });
                        }}
                    />
                );
            })}
        </>
    );
};

