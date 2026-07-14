<?php
/**
 * api/auth.php
 * Handles: login, student signup, teacher signup, forgot-password flow.
 *
 * All requests are POST with an "action" field:
 *   action=login            role, id, pass
 *   action=signup_student   fullname, username, email, studentId, pass, program, year, section
 *   action=signup_teacher   fullname, username, email, pass, program, year, section
 *   action=forgot_send      email
 *   action=forgot_reset     email, code, newpass
 */

require_once __DIR__ . '/../config.php';

$data   = post_data();
$action = $data['action'] ?? '';

switch ($action) {

    case 'login': {
        $role = $data['role'] ?? '';
        $id   = trim($data['id'] ?? '');
        $pass = $data['pass'] ?? '';

        if ($id === '' || $pass === '') {
            respond(['success' => false, 'message' => 'Please enter both username/email and password.']);
        }

        // Match by username, email, or (for students) student_id.
        // Columns are aliased to camelCase to match the front end's existing field names.
        $stmt = $pdo->prepare(
            "SELECT id, fullname, username, email, password, role, approved,
                    student_id AS studentId,
                    assigned_program AS assignedProgram,
                    assigned_year AS assignedYear,
                    assigned_section AS assignedSection,
                    dept
             FROM users
             WHERE role = :role
               AND (username = :id OR email = :id OR (role = 'student' AND student_id = :id))
             LIMIT 1"
        );
        $stmt->execute(['role' => $role, 'id' => $id]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, $user['password'])) {
            respond(['success' => false, 'message' => 'Invalid credentials or wrong portal.']);
        }
        if (!((int) $user['approved']) && $role !== 'student') {
            respond(['success' => false, 'message' => 'Account pending admin approval.']);
        }

        unset($user['password']);
        $user['approved'] = (bool) (int) $user['approved'];
        respond(['success' => true, 'user' => $user]);
        break;
    }

    case 'signup_student': {
        $fullname  = trim($data['fullname'] ?? '');
        $username  = trim($data['username'] ?? '');
        $email     = trim($data['email'] ?? '');
        $studentId = trim($data['studentId'] ?? '');
        $pass      = $data['pass'] ?? '';
        $program   = $data['program'] ?? '';
        $year      = $data['year'] ?? '';
        $section   = $data['section'] ?? '';

        if (!$fullname || !$username || !$email || !$studentId || !$pass || !$program || !$year || !$section) {
            respond(['success' => false, 'message' => 'Please fill all fields.']);
        }
        if (!str_ends_with($email, '@gmail.com')) {
            respond(['success' => false, 'message' => 'Email must be @gmail.com']);
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
        $check->execute([$username, $email]);
        if ($check->fetch()) {
            respond(['success' => false, 'message' => 'Username or email already exists.']);
        }

        $check2 = $pdo->prepare('SELECT id FROM students WHERE id = ?');
        $check2->execute([$studentId]);
        if ($check2->fetch()) {
            respond(['success' => false, 'message' => 'Student ID already exists. Please use a different ID.']);
        }

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO students (id, name, email, program, year, section, status, math, ethics, pe, oop, platform, reed)
                 VALUES (?, ?, ?, ?, ?, ?, "active", 1.5, 1.5, 1.5, 1.5, 1.5, 1.5)'
            );
            $ins->execute([$studentId, $fullname, $email, $program, $year, $section]);

            $uid = 'u' . round(microtime(true) * 1000);
            $insUser = $pdo->prepare(
                'INSERT INTO users (id, fullname, username, email, password, role, approved, student_id, assigned_program, assigned_year, assigned_section)
                 VALUES (?, ?, ?, ?, ?, "student", 1, ?, ?, ?, ?)'
            );
            $insUser->execute([
                $uid, $fullname, $username, $email,
                password_hash($pass, PASSWORD_DEFAULT),
                $studentId, $program, $year, $section,
            ]);

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond(['success' => false, 'message' => 'Could not create account: ' . $e->getMessage()]);
        }

        // Count matching teachers (for the friendly confirmation message).
        $matchStmt = $pdo->prepare(
            "SELECT COUNT(*) AS c FROM users
             WHERE role = 'teacher' AND assigned_program = ? AND assigned_year = ?
               AND (assigned_section = 'ALL' OR assigned_section = ?
                    OR (assigned_section = 'ABC' AND ? IN ('A','B','C'))
                    OR (assigned_section = 'AB'  AND ? IN ('A','B'))
                    OR (assigned_section = 'AC'  AND ? IN ('A','C'))
                    OR (assigned_section = 'BC'  AND ? IN ('B','C')))"
        );
        $matchStmt->execute([$program, $year, $section, $section, $section, $section, $section]);
        $teacherCount = (int) $matchStmt->fetch()['c'];

        respond([
            'success' => true,
            'message' => 'Account created! Please login.',
            'teacherCount' => $teacherCount,
        ]);
        break;
    }

    case 'signup_teacher': {
        $fullname = trim($data['fullname'] ?? '');
        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $pass     = $data['pass'] ?? '';
        $program  = $data['program'] ?? '';
        $year     = $data['year'] ?? '';
        $section  = $data['section'] ?? '';

        if (!$fullname || !$username || !$email || !$pass || !$program || !$year || !$section) {
            respond(['success' => false, 'message' => 'Please fill all fields including Program, Year, and Section.']);
        }
        if (!str_ends_with($email, '@gmail.com')) {
            respond(['success' => false, 'message' => 'Email must be @gmail.com']);
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
        $check->execute([$username, $email]);
        if ($check->fetch()) {
            respond(['success' => false, 'message' => 'Username/email exists.']);
        }

        $uid = 'u' . round(microtime(true) * 1000);
        $ins = $pdo->prepare(
            'INSERT INTO users (id, fullname, username, email, password, role, approved, assigned_program, assigned_year, assigned_section)
             VALUES (?, ?, ?, ?, ?, "teacher", 0, ?, ?, ?)'
        );
        $ins->execute([$uid, $fullname, $username, $email, password_hash($pass, PASSWORD_DEFAULT), $program, $year, $section]);

        $matchStmt = $pdo->prepare(
            "SELECT COUNT(*) AS c FROM students
             WHERE program = ? AND year = ?
               AND (? = 'ALL' OR section = ?
                    OR (? = 'ABC' AND section IN ('A','B','C'))
                    OR (? = 'AB'  AND section IN ('A','B'))
                    OR (? = 'AC'  AND section IN ('A','C'))
                    OR (? = 'BC'  AND section IN ('B','C')))"
        );
        $matchStmt->execute([$program, $year, $section, $section, $section, $section, $section, $section]);
        $studentCount = (int) $matchStmt->fetch()['c'];

        respond(['success' => true, 'message' => 'Submitted! Awaiting admin approval.', 'studentCount' => $studentCount]);
        break;
    }

    case 'forgot_send': {
        $email = trim($data['email'] ?? '');
        $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $check->execute([$email]);
        if (!$check->fetch()) {
            respond(['success' => false, 'message' => 'Email not found.']);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', time() + 600); // 10 minutes

        $ins = $pdo->prepare('INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)');
        $ins->execute([$email, $code, $expires]);

        // Demo only: a real system emails this code instead of returning it.
        respond(['success' => true, 'message' => 'Reset code (demo): ' . $code]);
        break;
    }

    case 'forgot_reset': {
        $email = trim($data['email'] ?? '');
        $code  = trim($data['code'] ?? '');
        $newpass = $data['newpass'] ?? '';

        $stmt = $pdo->prepare(
            'SELECT * FROM password_resets
             WHERE email = ? AND code = ? AND used = 0 AND expires_at >= NOW()
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$email, $code]);
        $reset = $stmt->fetch();

        if (!$reset) {
            respond(['success' => false, 'message' => 'Wrong or expired code.']);
        }

        $upd = $pdo->prepare('UPDATE users SET password = ? WHERE email = ?');
        $upd->execute([password_hash($newpass, PASSWORD_DEFAULT), $email]);

        $mark = $pdo->prepare('UPDATE password_resets SET used = 1 WHERE id = ?');
        $mark->execute([$reset['id']]);

        respond(['success' => true, 'message' => 'Password changed!']);
        break;
    }

    default:
        respond(['success' => false, 'message' => 'Unknown action.']);
}
