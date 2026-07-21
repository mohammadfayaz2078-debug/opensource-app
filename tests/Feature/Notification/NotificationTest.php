<?php

namespace Tests\Feature\Notification;

use Tests\TestCase;
use App\Models\Notification;

class NotificationTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_notifications(): void
    {
        $response = $this->getJson('/api/notifications');
        $response->assertOk();
    }

    public function test_can_get_unread_notifications(): void
    {
        $response = $this->getJson('/api/notifications/unread');
        $response->assertOk();
    }

    public function test_can_get_unread_count(): void
    {
        $response = $this->getJson('/api/notifications/unread-count');
        $response->assertOk();
        $response->assertJsonStructure(['count']);
    }

    public function test_can_mark_notification_as_read(): void
    {
        $notification = Notification::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'notifiable_type' => 'User',
            'notifiable_id' => $this->user->id,
            'type' => 'test',
            'title' => 'Test',
            'message' => 'Test notification',
            'is_read' => false,
        ]);

        $response = $this->postJson("/api/notifications/{$notification->id}/read");
        $response->assertOk();

        $notification->refresh();
        $this->assertTrue($notification->is_read);
    }

    public function test_can_mark_all_as_read(): void
    {
        Notification::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'notifiable_type' => 'User',
            'notifiable_id' => $this->user->id,
            'type' => 'test',
            'title' => 'Test',
            'message' => 'Test',
            'is_read' => false,
        ]);

        $response = $this->postJson('/api/notifications/mark-all-read');
        $response->assertOk();

        $unreadCount = Notification::where('user_id', $this->user->id)
            ->where('is_read', false)
            ->count();

        $this->assertEquals(0, $unreadCount);
    }
}
