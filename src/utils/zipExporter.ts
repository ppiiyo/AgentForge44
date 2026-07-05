import JSZip from 'jszip';

export interface WorkflowSnapshot {
  id: string;
  name: string;
  timestamp: string;
  nodes: any[];
  connections: any[];
}

/**
 * Packs all local workflow snapshots into a single, highly compressed ZIP archive
 * and triggers a native client browser file download.
 */
export const exportSnapshotsToZip = async (
  snapshots: WorkflowSnapshot[],
  projectName: string
): Promise<void> => {
  if (!snapshots || snapshots.length === 0) {
    throw new Error("No snapshots available to export.");
  }

  const zip = new JSZip();
  
  // Generate a neat manifest / read-me summary file
  const readmeLines = [
    `==================================================`,
    `📦 KostromAi44 BULK WORKFLOW SNAPSHOTS ARCHIVE`,
    `==================================================`,
    `Project:      ${projectName || "Unnamed Workspace"}`,
    `Export Date:  ${new Date().toLocaleString()}`,
    `Snapshots:    ${snapshots.length} total versions saved`,
    `==================================================`,
    ``,
    `To restore any file in this archive, import the individual JSON files`,
    `using the standard Project Import option in the editor header.`,
    ``,
    `Snapshots Index:`
  ];

  snapshots.forEach((snap, idx) => {
    readmeLines.push(`  - [${idx + 1}] ${snap.name} (${snap.timestamp}) [Nodes: ${snap.nodes?.length || 0}]`);
  });

  zip.file("README_MANIFEST.txt", readmeLines.join("\n"));

  // Add individual JSON workflows
  snapshots.forEach((snap, index) => {
    // Sanitize filename to ensure compatibility across OS file systems
    const sanitizedName = snap.name.replace(/[/\\?%*:|"<>\s]/g, "_");
    const fileName = `snapshots/${String(index + 1).padStart(2, '0')}_${sanitizedName || 'flow'}.json`;
    
    const fileContent = JSON.stringify({
      version: "1.0",
      appId: "kostromai44",
      projectName: snap.name,
      timestamp: snap.timestamp,
      nodes: snap.nodes,
      connections: snap.connections
    }, null, 2);

    zip.file(fileName, fileContent);
  });

  // Generate the binary blob
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });

  // Safe file downloader anchor trigger
  const blobUrl = URL.createObjectURL(zipBlob);
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = blobUrl;
  
  const formattedProjectName = (projectName || "workspace").replace(/[/\\?%*:|"<>\s]/g, "_");
  downloadAnchor.download = `${formattedProjectName}_snapshots_export_${Date.now()}.zip`;
  
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  
  // Cleanup references to avoid memory leaks
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(blobUrl);
};
