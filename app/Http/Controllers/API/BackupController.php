<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class BackupController extends Controller
{
    /**
     * Download database backup
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function download(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Check if user is authorized (optional - add your own logic)
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Generate filename with timestamp
            $filename = 'isp_system_backup_' . Carbon::now()->format('Y-m-d_H-i-s') . '.sql';
            
            // Generate backup content
            $backupContent = $this->generateBackupContent($user);
            
            if (empty($backupContent)) {
                throw new \Exception('Backup content is empty');
            }

            // Return as downloadable file
            return response($backupContent, 200)
                ->header('Content-Type', 'application/sql')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Content-Length', strlen($backupContent))
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');
            
        } catch (\Exception $e) {
   
            return response()->json([
                'success' => false,
                'message' => 'Backup failed: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate backup content
     *
     * @param \App\Models\User $user
     * @return string
     * @throws \Exception
     */
    private function generateBackupContent($user)
    {
        $output = "";
        
        try {
            // Get database name
            $databaseName = DB::getDatabaseName();
            
            // Header information
            $output .= "-- =========================================================\n";
            $output .= "-- MySQL Database Backup\n";
            $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
            $output .= "-- Database: {$databaseName}\n";
            $output .= "-- Created by: " . ($user->name ?? 'System') . "\n";
            $output .= "-- Backup Type: Full Database Backup\n";
            $output .= "-- =========================================================\n\n";
            
            // Disable foreign key checks
            $output .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";
            $output .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
            $output .= "SET AUTOCOMMIT = 0;\n";
            $output .= "START TRANSACTION;\n\n";

            // Get all tables
            $tables = DB::select('SHOW TABLES');
            $tableKey = 'Tables_in_' . $databaseName;
            
            foreach ($tables as $tableObj) {
                $tableName = $tableObj->$tableKey;
                
                // Drop table if exists
                $output .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
                
                // Get CREATE TABLE statement
                $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
                $output .= $createTable[0]->{'Create Table'} . ";\n\n";
                
                // Get table data
                $rows = DB::table($tableName)->get();
                
                if ($rows->count() > 0) {
                    $output .= "INSERT INTO `{$tableName}` VALUES \n";
                    
                    $insertValues = [];
                    foreach ($rows as $row) {
                        $rowArray = (array)$row;
                        $values = [];
                        
                        foreach ($rowArray as $value) {
                            if ($value === null) {
                                $values[] = 'NULL';
                            } elseif (is_numeric($value)) {
                                $values[] = $value;
                            } else {
                                // Escape special characters
                                $value = addslashes($value);
                                $value = str_replace("\n", "\\n", $value);
                                $value = str_replace("\r", "\\r", $value);
                                $values[] = "'" . $value . "'";
                            }
                        }
                        $insertValues[] = "(" . implode(', ', $values) . ")";
                    }
                    
                    $output .= implode(",\n", $insertValues) . ";\n\n";
                } else {
                    $output .= "-- Table `{$tableName}` is empty\n\n";
                }
            }
            
            // Re-enable foreign key checks
            $output .= "SET FOREIGN_KEY_CHECKS = 1;\n\n";
            $output .= "COMMIT;\n\n";
            $output .= "-- Backup completed successfully at " . date('Y-m-d H:i:s') . "\n";
            
            return $output;
            
        } catch (\Exception $e) {
            throw new \Exception('Database backup generation failed: ' . $e->getMessage());
        }
    }
}