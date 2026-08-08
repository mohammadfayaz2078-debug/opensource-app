<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Force the test environment values into every environment source
     * (putenv, $_ENV and $_SERVER) BEFORE the application boots.
     *
     * Why this is needed:
     * - PHPUnit's <env> tags in phpunit.xml only populate $_ENV/putenv.
     * - Laravel's env() helper reads $_SERVER first, and PHP copies any
     *   DB_CONNECTION/DB_DATABASE exported in the parent shell into
     *   $_SERVER at process start — so those would win and the suite
     *   would run against a real database.
     */
    public function createApplication()
    {
        foreach (self::envOverrides() as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        return parent::createApplication();
    }

    /**
     * Safety guard: the suite uses RefreshDatabase, which wipes the database.
     * It must therefore ONLY ever run against the in-memory SQLite database
     * configured here — never against a real MySQL/Postgres database.
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \RuntimeException(
                'Refusing to run tests: tests must use the in-memory SQLite database, got "'.config('database.default').'" / "'.config('database.connections.sqlite.database').'".'
            );
        }
    }

    /**
     * Test environment overrides. Keep in sync with the <php><env> block in phpunit.xml.
     *
     * @return array<string, string>
     */
    public static function envOverrides(): array
    {
        return [
            'APP_ENV' => 'testing',
            'APP_MAINTENANCE_DRIVER' => 'file',
            'BCRYPT_ROUNDS' => '4',
            'BROADCAST_CONNECTION' => 'null',
            'CACHE_STORE' => 'array',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'MAIL_MAILER' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'SESSION_DRIVER' => 'array',
            'PULSE_ENABLED' => 'false',
            'TELESCOPE_ENABLED' => 'false',
            'NIGHTWATCH_ENABLED' => 'false',
        ];
    }
}
